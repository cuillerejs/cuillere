import { type Effect, isEffect } from './effect'
import { error, unrecognizedEffect, CancellationError, captured } from './errors'
import { isGenerator, Generator } from './generator'
import { HandleFunction, Validator } from './plugins'
import {
  Operation, Wrapper, Execute, CallOperation, NextOperation,
  execute, isOperation, isWrapper, isFork, isDefer, isRecover, isTerminal, coreNamespace,
} from './operations'

export class Stack {
  result: Promise<any>

  private handlers: Record<string, HandleFunction[]>

  private ctx: any

  private validators?: Record<string, Validator>

  private rootFrame = new StackFrame(null, null)

  private currentFrame = this.rootFrame

  private settled = false

  private canceled = false

  constructor(handlers: Record<string, HandleFunction[]>, ctx: any, validators?: Record<string, Validator>) {
    this.handlers = handlers
    this.ctx = ctx
    this.validators = validators
  }

  start(value: any) {
    this.handle(value)

    this.result = this.execute().finally(() => { this.settled = true })

    return this
  }

  async execute() {
    for await (const value of this.yields) this.handle(value)

    if (this.canceled) throw new CancellationError()

    if (this.rootFrame.result.hasError) throw this.rootFrame.result.error

    return this.rootFrame.result.value
  }

  handle(value: any) {
    try {
      this.currentFrame = this.stackFrameFor(this.validateEffect(value), this.currentFrame)
    } catch (e) {
      this.captureCoreStackTrace(e)
      this.currentFrame.result = { hasError: true, error: e }
    }
  }

  stackFrameFor(effect: Effect, curFrame: StackFrame, handlerIndex = 0): StackFrame {
    let operation: Operation

    // Give priority to Operation over other kinds of effects
    if (isOperation(effect)) {
      operation = effect
    } else {
      // No handler for generator execution, directly put it on the stack
      if (!(`${coreNamespace}/execute` in this.handlers)) return new StackFrame(effect, curFrame)

      operation = execute(effect)
    }

    const handlers = this.handlers[operation.kind]

    // If no (or no more) handler for this kind of operation
    if (!handlers || handlerIndex === handlers.length) return this.handleCore(operation, curFrame)

    const gen = handlers[handlerIndex](operation, this.ctx)

    return new HandlerStackFrame(gen, curFrame, operation.kind, handlerIndex)
  }

  handleCore(operation: Operation, curFrame: StackFrame): StackFrame {
    if (!(operation.kind in this.coreHandlers)) throw unrecognizedEffect(operation)

    return this.coreHandlers[operation.kind](operation, curFrame)
  }

  coreHandlers: Record<string, (operation: Effect, curFrame: StackFrame) => StackFrame> = {
    [`${coreNamespace}/call`]: ({ func, args }: CallOperation, curFrame) => {
      if (!func) throw new TypeError(`call: cannot call ${func}`) // FIXME improve and move to validator

      const gen = func(...args)

      if (!isGenerator(gen)) throw new TypeError('call: function did not return a Generator')

      gen.name = func.name

      return new StackFrame(gen, curFrame)
    },

    [`${coreNamespace}/execute`]: ({ gen }: Execute, curFrame) => {
      if (!isGenerator(gen)) throw new TypeError(`execute: ${gen} is not a Generator`)

      return new StackFrame(gen, curFrame)
    },

    [`${coreNamespace}/fork`]: ({ effect }: Wrapper, curFrame) => {
      curFrame.result.value = new Task(new Stack(this.handlers, this.ctx, this.validators).start(effect))

      return curFrame
    },

    [`${coreNamespace}/start`]: ({ effect }: Wrapper, curFrame) => this.stackFrameFor(effect, curFrame),

    [`${coreNamespace}/defer`]: ({ effect }: Wrapper, curFrame) => {
      curFrame.defers.unshift(effect)

      return curFrame
    },

    [`${coreNamespace}/recover`]: (_, curFrame) => {
      if (curFrame.previous.done && curFrame.previous.result.hasError) {
        curFrame.result = { hasError: false, value: curFrame.previous.result.error }
        curFrame.previous.result.hasError = false
        curFrame.previous.result.error = undefined
      }

      return curFrame
    },

    [`${coreNamespace}/terminal`]: ({ effect }: Wrapper, curFrame) => {
      curFrame.terminate()

      return this.stackFrameFor(effect, curFrame.previous)
    },

    [`${coreNamespace}/generator`]: (_, curFrame) => {
      curFrame.result.value = curFrame.gen

      return curFrame
    },

    [`${coreNamespace}/next`]: ({ effect, terminal }: NextOperation, curFrame) => {
      if (!(curFrame instanceof HandlerStackFrame)) throw new TypeError('next: should be used only in handlers')

      const kind = isOperation(effect) ? effect.kind : `${coreNamespace}/execute`

      if (curFrame.kind !== kind) throw TypeError(`next: operation kind mismatch, expected "${curFrame.kind}", received "${kind}"`)

      if (terminal) curFrame.terminate()

      return this.stackFrameFor(effect, terminal ? curFrame.previous : curFrame, curFrame.index + 1)
    },
  }

  shift() {
    do {
      // Handle defers if any
      if (this.currentFrame.defers.length !== 0) {
        this.handle(this.currentFrame.defers.shift())
        return
      }

      // Copy yield result to previous frame
      if (this.currentFrame.previous && !this.currentFrame.previous.done) this.currentFrame.previous.result = this.currentFrame.result

      // Propagate uncaught error from defer
      if (this.currentFrame.previous?.done && this.currentFrame.result.hasError) {
        this.currentFrame.previous.result.hasError = true
        this.currentFrame.previous.result.error = this.currentFrame.result.error
      }

      this.currentFrame = this.currentFrame.previous
    } while (this.currentFrame?.done)
  }

  async cancel() {
    if (this.settled) return

    if (!this.canceled) {
      for (let frame = this.currentFrame; frame; frame = frame.previous) {
        frame.canceled = Canceled.ToDo
      }

      this.canceled = true
    }

    try {
      await this.result
    } catch (e) {
      if (CancellationError.isCancellationError(e)) return
      // This should not happen
      throw error('cancel: stack did not cancel properly: ', e.stack)
    }
  }

  get yields(): AsyncIterableIterator<any> {
    return {
      next: async (): Promise<IteratorResult<any>> => {
        let result: IteratorResult<any>
        let yielded = false

        while (!yielded) {
          if (this.currentFrame === this.rootFrame) return { done: true, value: undefined }

          try {
            if (this.currentFrame.canceled && this.currentFrame.canceled === Canceled.ToDo) {
              this.currentFrame.canceled = Canceled.Done
              result = await this.currentFrame.gen.return(undefined)
            } else {
              result = await (
                this.currentFrame.result.hasError
                  ? this.currentFrame.gen.throw(this.currentFrame.result.error)
                  : this.currentFrame.gen.next(this.currentFrame.result.value))
            }

            this.currentFrame.result = { hasError: false }
          } catch (e) {
            this.captureGeneratorStackTrace(e)
            this.currentFrame.result = { hasError: true, error: e }
            this.currentFrame.done = true
            this.shift()
            continue
          }

          if (result.done) {
            this.currentFrame.result.value = result.value
            this.currentFrame.done = true
            this.shift()
            continue
          }

          if (this.currentFrame.canceled === Canceled.ToDo) continue

          yielded = true
        }

        return result
      },

      [Symbol.asyncIterator]() {
        return this
      },
    }
  }

  validateEffect(effect: any): Effect {
    if (effect == undefined) throw new TypeError(`${effect} effect is forbidden`)

    // FIXME change to a more general message
    if (!isEffect(effect)) throw new TypeError(`${effect} is neither an operation nor a generator`)

    if (isOperation(effect)) {
      this.coreValidators[effect.kind]?.(effect)
      this.validators?.[effect.kind]?.(effect)

      if (isWrapper(effect)) this.validateEffect(effect.effect)
    }

    // FIXME additional validations when stack is starting (on rootFrame)

    return effect
  }

  coreValidators: Record<string, (operation: Operation) => void> = {
    [`${coreNamespace}/terminal`]({ effect }: Wrapper) {
      if (isFork(effect)) throw new TypeError('terminal forks are forbidden')
      if (isDefer(effect)) throw new TypeError('terminal defers are forbidden')
      if (isRecover(effect)) throw new TypeError('terminal recovers are forbidden')
      if (isTerminal(effect)) throw new TypeError('terminals cannot be nested')
    },
  }

  captureCoreStackTrace = Stack.captureStackTrace((stack) => {
    const handleIndex = stack.findIndex(frame => /^ +at Stack.handle \(.+\)$/.test(frame))
    if (handleIndex === -1) return

    stack.splice(
      handleIndex + 1, 0,
      ...this.getFrames(this.currentFrame),
    )
  })

  captureGeneratorStackTrace = Stack.captureStackTrace((stack) => {
    let i = 0
    while (stack[i] && !/^ +at .+\.next \(.+\)$/.test(stack[i])) i++
    if (i === stack.length) return
    const nextsStart = i

    do { i++ } while (stack[i] && /^ +at .+\.next \(.+\)$/.test(stack[i]))
    const nextsEnd = i

    if (this.currentFrame instanceof HandlerStackFrame && nextsStart > 0) {
      stack[nextsStart - 1] = stack[nextsStart - 1].replace(/^( + at ).+( \(.+\))$/, `$1<yield ${this.currentFrame.kind}>$2`)
    }

    stack.splice(nextsStart, nextsEnd - nextsStart, ...this.getFrames(this.currentFrame.previous))
  })

  static captureStackTrace(updateStack: (stack: string[]) => void) {
    return (e: any) => {
      if (!Object.isExtensible(e)) return

      if (e[captured]) return
      Object.defineProperty(e, captured, { value: true, enumerable: false })

      if (!e.stack) return

      const stack = e.stack.split('\n')

      updateStack(stack)

      e.stack = stack.join('\n')
    }
  }

  getFrames(firstFrame: StackFrame) {
    const newFrames = []
    for (let frame = firstFrame; frame !== this.rootFrame; frame = frame.previous) {
      if (frame instanceof HandlerStackFrame) newFrames.push(`    at <yield ${frame.kind}> (<unknown>)`)
      else newFrames.push(`    at ${frame.gen.name ?? '<anonymous generator>'} (<unknown>)`)
    }
    return newFrames
  }
}

export class Task {
  private stack: Stack

  constructor(stack: Stack) {
    this.stack = stack
  }

  async cancel() { return this.stack.cancel() }

  get result() { return this.stack.result }
}

interface StackFrameResult {
  value?: any
  hasError: boolean
  error?: any
}

class StackFrame {
  gen: Generator<any, Effect>

  previous: StackFrame

  canceled?: Canceled

  defers: Effect[] = []

  result: StackFrameResult = { hasError: false }

  done = false

  constructor(gen: Generator<any, Effect>, previous: StackFrame) {
    this.gen = gen
    this.previous = previous
  }

  async terminate() {
    try {
      if (this.defers.length !== 0) console.warn('cuillere: terminate: deferred effects are not executed')

      const { done } = await this.gen.return(undefined)

      if (!done) console.warn('cuillere: terminate: should not be used inside a try...finally')
    } catch (e) {
      console.warn('cuillere: terminate: generator did not terminate properly:', e)
    }
  }
}

class HandlerStackFrame extends StackFrame {
  kind: string

  index: number

  constructor(gen: Generator<any, Effect>, previous: StackFrame, kind: string, index: number) {
    super(gen, previous)
    this.kind = kind
    this.index = index
  }
}

enum Canceled {
  ToDo = 1,
  Done,
}

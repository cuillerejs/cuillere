import { FilteredHandler } from './middlewares'
import { Operation, OperationObject, Wrapper, Execute, CallOperation, isNext, isTerminal, execute, validateOperation } from './operations'
import { error, unrecognizedOperation, CancellationError } from './errors'
import { isGenerator, Generator } from './generator'

export class Stack {
  #handlers: Record<string, FilteredHandler[]>

  #ctx: any

  #currentFrame: StackFrame

  #result: StackFrameResult

  #resultPromise: Promise<any>

  #settled = false

  #canceled = false

  constructor(handlers: Record<string, FilteredHandler[]>, ctx: any) {
    this.#handlers = handlers
    this.#ctx = ctx
  }

  start(operation: any) {
    try {
      // FIXME additional validations on start operation
      this.handle(validateOperation(operation))

      this.#resultPromise = this.execute().finally(() => { this.#settled = true })
    } catch (e) {
      this.#resultPromise = Promise.reject(e)
      this.#settled = true
    }

    return this
  }

  async execute() {
    for await (const value of this.yields) {
      let operation: Operation
      try {
        operation = validateOperation(value)
      } catch (e) {
        this.#currentFrame.result = { hasError: true, error: e }
        continue
      }

      if (isTerminal(operation)) {
        // FIXME should throw in previous stackFrame
        try {
          // FIXME what should we do if there are defers ? warning ? throw ?
          if (!(await this.#currentFrame.gen.return(undefined)).done) throw new Error("don't use terminal operation inside a try...finally")
        } catch (e) {
          throw error('generator did not terminate properly. Caused by: ', e.stack)
        }
      }

      try {
        this.handle(operation)
      } catch (e) {
        // FIXME mutualize with try...catch of validateOperation ?
        this.#currentFrame.result = { hasError: true, error: e }
        continue
      }
    }

    if (this.#canceled) {
      throw new CancellationError()
    }

    if (this.#result.hasError) throw this.#result.error

    return this.#result.value
  }

  handle(operation: Operation) {
    if (isTerminal(operation)) {
      this.#currentFrame = this.stackFrameFor(operation.operation, this.#currentFrame.previous)
    } else {
      this.#currentFrame = this.stackFrameFor(operation, this.#currentFrame)
    }
  }

  stackFrameFor(pOperation: Operation, previous: StackFrame): StackFrame {
    let handlers: FilteredHandler[]
    let handlerIndex = 0
    let operation = pOperation

    if (isNext(operation)) {
      if (!(this.#currentFrame instanceof HandlerStackFrame)) throw new TypeError('next cannot be used outside of a handler')

      operation = operation.operation

      if (this.#currentFrame.kind !== operation.kind) {
        throw error(`operation kind mismatch in next: expected "${this.#currentFrame.kind}", got "${operation.kind}"`)
      }

      handlers = this.#currentFrame.handlers
      handlerIndex = this.#currentFrame.index + 1
    } else {
      if (isGenerator(operation)) {
        // no handler for generator execution, directly put it on the stack
        if (!this.#handlers.execute) return new StackFrame(operation, previous)
        operation = execute(operation)
      }

      handlers = this.#handlers[operation.kind]

      // There is no handler for this kind of operation
      if (!handlers) return this.stackFrameForCore(operation, previous)
    }

    for (; handlerIndex < handlers.length; handlerIndex++) {
      if (handlers[handlerIndex].filter(operation, this.#ctx)) break
    }

    // There is no handler left for this kind of operation
    if (handlerIndex === handlers.length) return this.stackFrameForCore(operation, previous)

    const gen = handlers[handlerIndex].handle(operation, this.#ctx)

    return new HandlerStackFrame(gen, previous, operation.kind, handlers, handlerIndex)
  }

  stackFrameForCore(operation: OperationObject, previous: StackFrame): StackFrame {
    const stackFrame = this.coreHandlers[operation.kind]?.(operation, previous)

    // FIXME this is not strictly true
    if (!stackFrame) throw unrecognizedOperation(operation)

    return stackFrame
  }

  coreHandlers: Record<string, (operation: Operation, previous: StackFrame) => StackFrame> = {
    call: ({ func, args }: CallOperation, previous) => {
      // FIXME improve error message
      if (!func) throw error('the call operation function is null or undefined')

      const gen = func(...args)

      // FIXME improve error message
      if (!isGenerator(gen)) throw error('the call operation function should return a Generator. You probably used `function` instead of `function*`')

      return new StackFrame(gen, previous)
    },

    execute: ({ gen }: Execute, previous) => {
      // FIXME improve error message
      if (!isGenerator(gen)) throw error('gen should be a generator')
      return new StackFrame(gen, previous)
    },

    fork: ({ operation }: Wrapper) => {
      this.#currentFrame.result.value = new Stack(this.#handlers, this.#ctx).start(operation)

      return this.#currentFrame
    },

    start: ({ operation }: Wrapper, previous: StackFrame) => this.stackFrameFor(operation, previous),

    defer: ({ operation }: Wrapper) => {
      this.#currentFrame.defers.unshift(operation)

      return this.#currentFrame
    },

    recover: () => {
      if (this.#currentFrame?.previous.done && this.#currentFrame.previous.result.hasError) {
        this.#currentFrame.result = { hasError: false, value: this.#currentFrame.previous.result.error }
        this.#currentFrame.previous.result.hasError = false
        this.#currentFrame.previous.result.error = undefined
      }

      return this.#currentFrame
    },
  }

  shift() {
    do {
      if (this.#currentFrame.defers.length !== 0) {
        this.handle(this.#currentFrame.defers.shift())
        return
      }

      if (this.#currentFrame.previous && !this.#currentFrame.previous.done) this.#currentFrame.previous.result = this.#currentFrame.result

      if (this.#currentFrame.previous?.done && this.#currentFrame.result.hasError) {
        this.#currentFrame.previous.result.hasError = true
        this.#currentFrame.previous.result.error = this.#currentFrame.result.error
      }

      if (!this.#currentFrame.previous) this.#result = this.#currentFrame.result

      this.#currentFrame = this.#currentFrame.previous
    } while (this.#currentFrame?.done)
  }

  async cancel() {
    if (this.#settled) return

    if (!this.#canceled) {
      for (let frame = this.#currentFrame; frame; frame = frame.previous) {
        frame.canceled = Canceled.ToDo
      }

      this.#canceled = true
    }

    try {
      await this.#resultPromise
    } catch (e) {
      if (CancellationError.isCancellationError(e)) return
      // This should not happen
      throw error('fork did not cancel properly. Caused by: ', e.stack)
    }
  }

  get yields(): AsyncIterableIterator<any> {
    return {
      next: async (): Promise<IteratorResult<any>> => {
        let result: IteratorResult<any>
        let yielded = false

        do {
          if (!this.#currentFrame) return { done: true, value: undefined }

          try {
            // FIXME add some tests for defer and finally when canceled
            if (this.#currentFrame.canceled && this.#currentFrame.canceled === Canceled.ToDo) {
              this.#currentFrame.canceled = Canceled.Done
              result = await this.#currentFrame.gen.return(undefined)
            } else {
              result = await (
                this.#currentFrame.result.hasError
                  ? this.#currentFrame.gen.throw(this.#currentFrame.result.error)
                  : this.#currentFrame.gen.next(this.#currentFrame.result.value))
            }

            this.#currentFrame.result = { hasError: false }
          } catch (e) {
            this.#currentFrame.result = { hasError: true, error: e }
            this.#currentFrame.done = true
            this.shift()
            continue
          }

          if (result.done) {
            this.#currentFrame.result.value = result.value
            this.#currentFrame.done = true
            this.shift()
            continue
          }

          if (this.#currentFrame.canceled === Canceled.ToDo) continue

          yielded = true
        } while (!yielded)

        return result
      },

      [Symbol.asyncIterator]() {
        return this
      },
    }
  }

  get result() {
    return this.#resultPromise
  }

  get settled() {
    return this.#settled
  }
}

export interface StackFrameResult {
  value?: any
  hasError: boolean
  error?: any
}

export class StackFrame {
  #gen: Generator<any, Operation>

  canceled?: Canceled

  #defers: Operation[] = []

  #previous: StackFrame

  result: StackFrameResult = { hasError: false }

  done = false

  constructor(gen: Generator<any, Operation>, previous: StackFrame) {
    this.#gen = gen
    this.#previous = previous
  }

  get gen() { return this.#gen }

  get defers() { return this.#defers }

  get previous() { return this.#previous }
}

export class HandlerStackFrame extends StackFrame {
  #kind: string

  #handlers: FilteredHandler[]

  #index: number

  constructor(gen: Generator<any, Operation>, previous: StackFrame, kind: string, handlers: FilteredHandler[], index: number) {
    super(gen, previous)
    this.#kind = kind
    this.#handlers = handlers
    this.#index = index
  }

  get kind() { return this.#kind }

  get handlers() { return this.#handlers }

  get index() { return this.#index }
}

export enum Canceled {
  ToDo = 1,
  Done,
}

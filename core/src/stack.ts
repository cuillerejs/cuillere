import { FilteredHandler } from './middlewares'
import { Operation, OperationObject, Wrapper, Execute, CallOperation, isNext, isTerminal, execute } from './operations'
import { error, unrecognizedOperation } from './errors'
import { isGenerator, Generator } from './generator'

export class Stack {
  #handlers: Record<string, FilteredHandler[]>

  #ctx: any

  #currentFrame: StackFrame

  constructor(handlers: Record<string, FilteredHandler[]>, ctx: any) {
    this.#handlers = handlers
    this.#ctx = ctx
  }

  shift() {
    this.#currentFrame = this.#currentFrame.previous
  }

  cancel() {
    for (let frame = this.#currentFrame; frame; frame = frame.previous) {
      frame.canceled = Canceled.ToDo
    }
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
    const stackFrame: StackFrame = coreHandlers[operation.kind]?.call(this, operation, previous)

    if (!stackFrame) throw unrecognizedOperation(operation)

    return stackFrame
  }

  get currentFrame() { return this.#currentFrame }
}

const coreHandlers = {
  call({ func, args }: CallOperation, previous: StackFrame): StackFrame {
    // FIXME improve error message
    if (!func) throw error('the call operation function is null or undefined')

    const gen = func(...args)

    // FIXME improve error message
    if (!isGenerator(gen)) throw error('the call operation function should return a Generator. You probably used `function` instead of `function*`')

    return new StackFrame(gen, previous)
  },

  execute({ gen }: Execute, previous: StackFrame): StackFrame {
    // FIXME improve error message
    if (!isGenerator(gen)) throw error('gen should be a generator')
    return new StackFrame(gen, previous)
  },

  start(operation: Wrapper, previous: StackFrame): StackFrame {
    return this.stackFrameFor(operation.operation, previous)
  },
}

export class StackFrame {
  #gen: Generator<any, Operation>

  canceled?: Canceled

  #defers: Operation[] = []

  #previous: StackFrame

  #res: any

  #isError: boolean

  constructor(gen: Generator<any, Operation>, previous: StackFrame) {
    this.#gen = gen
    this.#previous = previous
  }

  get gen() { return this.#gen }

  get defers() { return this.#defers }

  get previous() { return this.#previous }

  get res() { return this.#res }

  get isError() { return this.#isError }

  set returns(res: any) {
    this.#res = res
    this.#isError = false
  }

  set throws(e: any) {
    this.#res = e
    this.#isError = true
  }
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

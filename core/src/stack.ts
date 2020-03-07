import { FilteredHandler } from './middlewares'
import { Operation, Wrapper, Execute, Call, isNext, isTerminal } from './operations'
import { error, unrecognizedOperation } from './errors'
import { isGenerator } from './generator'

export class Stack {
  #handlers: Record<string, FilteredHandler[]>

  #ctx: any

  currentFrame: StackFrame

  constructor(handlers: Record<string, FilteredHandler[]>, ctx: any) {
    this.#handlers = handlers
    this.#ctx = ctx
  }

  shift() {
    this.currentFrame = this.currentFrame.previous
  }

  cancel() {
    for (let frame = this.currentFrame; frame; frame = frame.previous) {
      frame.canceled = Canceled.ToDo
    }
  }

  handle(operation: Operation) {
    if (isTerminal(operation)) {
      this.currentFrame = this.stackFrameFor(operation.operation, this.currentFrame.previous)
    } else {
      this.currentFrame = this.stackFrameFor(operation, this.currentFrame)
    }
  }

  stackFrameFor(pOperation: Operation, previous: StackFrame): StackFrame {
    let handlers: FilteredHandler[]
    let handlerIndex = 0
    let operation = pOperation

    if (isNext(operation)) {
      if (!this.currentFrame?.isHandler) throw error('next yielded outside of middleware')
      handlerIndex = this.currentFrame.handlerIndex + 1
      handlers = this.currentFrame.handlers
      operation = operation.operation
    } else {
      handlers = this.#handlers[operation.kind]
      // There is no middleware for this kind of operation
      if (!handlers) return this.stackFrameForCore(operation, previous)
    }

    for (; handlerIndex < handlers.length; handlerIndex++) {
      if (handlers[handlerIndex].filter(operation, this.#ctx)) break
    }

    // There is no middleware left for this kind of operation
    if (handlerIndex === handlers.length) return this.stackFrameForCore(operation, previous)

    const gen = handlers[handlerIndex].handle(operation, this.#ctx)
    return { isHandler: true, gen, handlers, handlerIndex, defers: [], previous }
  }

  stackFrameForCore(operation: Operation, previous: StackFrame): StackFrame {
    const stackFrame: StackFrame = coreHandlers[operation.kind]?.call(this, operation, previous)

    if (!stackFrame) throw unrecognizedOperation(operation)

    return stackFrame
  }
}

const coreHandlers = {
  call({ func, args }: Call, previous: StackFrame): OperationStackFrame {
    // FIXME improve error message
    if (!func) throw error('the call operation function is null or undefined')

    const gen = func(...args)

    // FIXME improve error message
    if (!isGenerator(gen)) throw error('the call operation function should return a Generator. You probably used `function` instead of `function*`')

    return { gen, isHandler: false, defers: [], previous }
  },

  execute({ gen }: Execute, previous: StackFrame): OperationStackFrame {
    // FIXME improve error message
    if (!isGenerator(gen)) throw error('gen should be a generator')
    return { gen, isHandler: false, defers: [], previous }
  },

  start(operation: Wrapper, previous: StackFrame): StackFrame {
    return this.stackFrameFor(operation.operation, previous)
  },
}

export type StackFrame = OperationStackFrame | HandlerStackFrame

export interface OperationStackFrame {
  isHandler: false
  gen: Generator | AsyncGenerator
  canceled?: Canceled
  defers: any[]
  previous?: StackFrame
}

export interface HandlerStackFrame {
  isHandler: true
  gen: Generator | AsyncGenerator
  canceled?: Canceled
  defers: any[]
  previous?: StackFrame
  handlers: FilteredHandler[]
  handlerIndex: number
}

export enum Canceled {
  ToDo = 1,
  Done,
}

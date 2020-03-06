import { Middleware, FilteredHandler, Handler } from './middlewares'
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

  private stackFrameFor(operation: Operation, previous: StackFrame): StackFrame {
    if (isNext(operation)) {
      if (!this.currentFrame?.isHandler) throw error('next yielded outside of middleware')

      const handlerIndex = this.currentFrame?.handlerIndex
      let nextHandlerIndex = handlerIndex === undefined ? undefined : handlerIndex + 1

      if (nextHandlerIndex === undefined) {
        return this.fallbackStackFrameFor(operation.operation, previous)
      }

      for (; nextHandlerIndex < this.currentFrame.handlers.length; nextHandlerIndex++) {
        if (this.currentFrame.handlers[nextHandlerIndex].filter(operation, this.#ctx)) break
      }

      if (nextHandlerIndex === this.currentFrame.handlers.length) return this.fallbackStackFrameFor(operation, previous)

      return {
        isHandler: true,
        gen: this.currentFrame.handlers[nextHandlerIndex].handle(operation.operation, this.#ctx),
        handlers: this.currentFrame.handlers,
        handlerIndex: nextHandlerIndex,
        defers: [],
        previous,
      }
    }

    const handlers = this.#handlers[operation.kind]
    if (!handlers) return this.fallbackStackFrameFor(operation, previous)

    return {
      isHandler: true,
      handlers,
      handlerIndex: 0,
      gen: handlers[0].handle(operation, this.#ctx),
      defers: [],
      previous,
    }
  }

  private fallbackStackFrameFor(operation: Operation, previous: StackFrame): StackFrame {
    const stackFrame: StackFrame = this[`fallback_${operation.kind}`]?.(operation, previous)

    if (!stackFrame) throw unrecognizedOperation(operation)

    return stackFrame
  }

  #fallback_call() {

  }

  #fallbackHandlers = {
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

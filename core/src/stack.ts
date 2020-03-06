import { Middleware } from './middlewares'
import { isTerminal, isNext, isStart, isExecute, isCall } from './operations'
import { error, unrecognizedOperation } from './errors'
import { isGenerator } from './generator'

export class Stack {
  #mws: Middleware[]

  #ctx: any

  currentFrame: StackFrame

  constructor(mws: Middleware[], ctx: any) {
    this.#mws = mws
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

  handle(operation: any) {
    if (isTerminal(operation)) {
      this.currentFrame = this.stackFrameFor(operation.operation, this.currentFrame.previous)
    } else {
      this.currentFrame = this.stackFrameFor(operation, this.currentFrame)
    }
  }

  private stackFrameFor(operation: any, previous: StackFrame): StackFrame {
    if (isNext(operation)) {
      if (!this.currentFrame?.isMiddleware) throw error('next yielded outside of middleware')

      const mwIndex = this.currentFrame?.mwIndex
      const nextMwIndex = mwIndex === undefined ? undefined : mwIndex + 1

      if (nextMwIndex === undefined || nextMwIndex === this.#mws.length) {
        return this.fallbackStackFrameFor(operation.operation, previous)
      }

      return {
        gen: this.#mws[nextMwIndex](operation.operation, this.#ctx),
        isMiddleware: true,
        mwIndex: nextMwIndex,
        defers: [],
        previous,
      }
    }

    if (this.#mws.length === 0) return this.fallbackStackFrameFor(operation, previous)

    return {
      gen: this.#mws[0](operation, this.#ctx),
      isMiddleware: true,
      mwIndex: 0,
      defers: [],
      previous,
    }
  }

  private fallbackStackFrameFor(operation: any, previous: StackFrame): StackFrame {
    if (isStart(operation)) return this.stackFrameFor(operation.operation, previous)

    if (!isExecute(operation) && !isCall(operation)) throw unrecognizedOperation(operation)

    let gen: any

    if (isExecute(operation)) {
      // FIXME improve error message
      if (!isGenerator(operation.gen)) throw error('gen should be a generator')

      gen = operation.gen
    } else {
      // FIXME improve error message
      if (!operation.func) throw error('the call operation function is null or undefined')

      gen = operation.func(...operation.args)

      // FIXME improve error message
      if (!isGenerator(gen)) throw error('the call operation function should return a Generator. You probably used `function` instead of `function*`')
    }

    return {
      gen,
      isMiddleware: false,
      defers: [],
      previous,
    }
  }
}

export interface StackFrame {
  gen: Generator | AsyncGenerator
  isMiddleware: boolean
  mwIndex?: number
  canceled?: Canceled
  defers: any[]
  previous: StackFrame
}

export enum Canceled {
  ToDo = 1,
  Done,
}

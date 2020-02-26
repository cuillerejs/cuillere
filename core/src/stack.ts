import { Middleware } from './middlewares'
import { isTerminal, isNext, isStart, isExecute, isCall } from './operations'
import { error, unrecognizedOperation } from './errors'
import { isGenerator } from './generator'

export class Stack extends Array<StackFrame> {
  #mws: Middleware[]

  #ctx: any

  constructor(mws: Middleware[], ctx: any) {
    super()
    this.#mws = mws
    this.#ctx = ctx
  }

  handle(operation: any) {
    if (isTerminal(operation)) {
      this[0] = this.stackFrameFor(operation.operation)
    } else {
      this.unshift(this.stackFrameFor(operation))
    }
  }

  private stackFrameFor(operation: any): StackFrame {
    if (isNext(operation)) {
      if (!this[0]?.isMiddleware) throw error('next yielded outside of middleware')

      const nextMwIndex = this[0]?.mwIndex === undefined ? undefined : this[0].mwIndex + 1

      if (nextMwIndex === undefined || nextMwIndex === this.#mws.length) {
        return this.fallbackStackFrameFor(operation.operation)
      }

      return {
        gen: this.#mws[nextMwIndex](operation.operation, this.#ctx),
        isMiddleware: true,
        mwIndex: nextMwIndex,
        defers: [],
      }
    }

    if (this.#mws.length === 0) return this.fallbackStackFrameFor(operation)

    return {
      gen: this.#mws[0](operation, this.#ctx),
      isMiddleware: true,
      mwIndex: 0,
      defers: [],
    }
  }

  private fallbackStackFrameFor(operation: any): StackFrame {
    if (isStart(operation)) return this.stackFrameFor(operation.operation)

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
    }
  }
}

export interface StackFrame {
  gen: Generator | AsyncGenerator
  isMiddleware: boolean
  mwIndex?: number
  canceled?: Canceled
  defers: any[]
}

export enum Canceled {
  ToDo = 1,
  Done,
}

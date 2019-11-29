import { unrecognizedOperation } from './errors'
import { contextMiddleware, callMiddleware, concurrentMiddleware, Middleware, call } from './middlewares'
import { GeneratorFunc, Generator } from './utils/generator'

const START = Symbol('START')

interface Start {
  [START]: true,
  operation: any,
}

function start(operation: any): Start {
  return {
    [START]: true,
    operation,
  }
}

export function isStart(operation: any): operation is Start {
  return operation && operation[START]
}

const finalMiddleware: Middleware = (_next, _ctx, run) => operation => {
  if (!isStart(operation)) throw unrecognizedOperation(operation)
  return run(operation.operation)
}

export interface OperationHandler {
  (operation: any): Promise<any>
}

export interface Cuillere {
  ctx: (ctx: any) => Cuillere
  run: OperationHandler
  start: OperationHandler
  execute: <Args extends any[], R>(func: GeneratorFunc<Args, R> | Generator<R>, ...args: Args) => Promise<any>
}

export default function cuillere(...middlewares: Middleware[]): Cuillere {
  const mws = [
    ...middlewares,
    concurrentMiddleware,
    callMiddleware,
    contextMiddleware,
  ]

  const make = (ctx: any) => {
    const cllr: Cuillere = {
      ctx: make,
      run: operation => {
        let runCtx = ctx || {}
        const run: OperationHandler = operation => mws.reduceRight(
          (next, prev) => prev(next, runCtx, run),
          finalMiddleware(undefined, runCtx, run),
        )(operation)
        return run(operation)
      },
      start: operation => cllr.run(start(operation)),
      execute: (func, ...args) => cllr.start(call(func, ...args)),
    }

    return cllr
  }

  return make(undefined)
}

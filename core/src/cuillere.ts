import { unrecognizedOperation } from './errors'
import { contextMiddleware, executeMiddleware, concurrentMiddleware, Middleware, call, execute } from './middlewares'
import { GeneratorFunc, Generator } from './generator'

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
  start: OperationHandler
  call: <Args extends any[], R>(func: GeneratorFunc<Args, R>, ...args: Args) => Promise<any>
  execute: <R>(gen: Generator<R>) => Promise<any>
}

export default function cuillere(...middlewares: Middleware[]): Cuillere {
  middlewares.forEach((mw, index) => {
    if (typeof mw !== 'function') {
      throw TypeError(`middlewares[${index}] should be a function: ${mw}`)
    }
  })

  const mws = [
    ...middlewares,
    concurrentMiddleware(),
    executeMiddleware(),
    contextMiddleware(),
  ]

  const cllrCache = new WeakMap<any, Cuillere>()

  const make = (pCtx?: any) => {
    const ctx = pCtx || {}

    if (ctx && cllrCache.has(ctx)) return cllrCache.get(ctx)

    const _run: OperationHandler = operation => run(operation)
    const run: OperationHandler = mws.reduceRight(
      (next, prev) => prev(next, ctx, _run),
      finalMiddleware(undefined, ctx, _run),
    )

    const cllr: Cuillere = {
      ctx: make,
      start: operation => run(start(operation)),
      call: (func, ...args) => cllr.start(call(func, ...args)),
      execute: gen => cllr.start(execute(gen)),
    }

    return cllr
  }

  return make(undefined)
}

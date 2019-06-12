/* eslint-disable no-await-in-loop */
import { unrecognizedOperation } from './errors'
import {
  contextMiddleware,
  callMiddleware,
  checkMiddlewares,
  Middleware,
  Next,
} from './middlewares'

const final: (ctx: any) => (operation: any) => Promise<any> = () => operation => {
  throw unrecognizedOperation(operation)
}

export function makeRunner(...middlewares: Middleware[]) {
  const RUN = Symbol('RUN')

  checkMiddlewares(middlewares)

  const run = [...middlewares, callMiddleware(RUN), contextMiddleware]
    .map(middleware => (next: (ctx: any) => Next) => (ctx: any): Next => {
      const middlewareWithNext = middleware(next(ctx))
      return operation => middlewareWithNext(operation, ctx)
    })
    .reduceRight((acc, middleware) => middleware(acc), final)

  return (ctx?: any) => {
    const runCtx = ctx || {}

    runCtx[RUN] = run

    return run(runCtx)
  }
}

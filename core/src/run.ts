/* eslint-disable no-await-in-loop */
import { unrecognizedOperation } from './errors'
import {
  contextMiddleware,
  callMiddleware,
  checkMiddlewares,
  Middleware,
  Next,
} from './middlewares'

const final: (ctx: any, run: Function) => Next = () => operation => {
  throw unrecognizedOperation(operation)
}

export function makeRunner(...middlewares: Middleware[]) {
  checkMiddlewares(middlewares)

  const run = [...middlewares, callMiddleware, contextMiddleware]
    .map(middleware => (next: (ctx: any, run: Function) => Next) => (ctx: any, run: Next): Next => {
      const middlewareWithNext = middleware(next(ctx, run))
      return operation => middlewareWithNext(operation, ctx, run)
    })
    .reduceRight((acc, middleware) => middleware(acc), final)

  return (ctx?: any) => {
    const runCtx = ctx || {}
    const runWithContext = run(runCtx, operation => runWithContext(operation))
    return runWithContext
  }
}

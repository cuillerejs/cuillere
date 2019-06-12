/* eslint-disable no-await-in-loop */
import { unrecognizedOperation } from './errors'
import { contextMiddleware, callMiddleware, checkMiddlewares, Middleware } from './middlewares'

export interface Run {
  (operation: any): Promise<any>
}

const final: (ctx: any, run: Run) => Run = () => operation => {
  throw unrecognizedOperation(operation)
}

export function makeRunner(...middlewares: Middleware[]) {
  checkMiddlewares(middlewares)

  const run = [...middlewares, callMiddleware, contextMiddleware]
    .map(middleware => (next: (ctx: any, run: Run) => Run) => (ctx: any, run: Run): Run => {
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

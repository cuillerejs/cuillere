/* eslint-disable no-await-in-loop */
import { unrecognizedOperation } from './errors'
import { contextMiddleware, callMiddleware, checkMiddlewares, Middleware } from './middlewares'

export interface Run {
  (operation: any): Promise<any>
}

export interface Next {
  (ctx: any, run: Run): Run
}

const final: Next = () => operation => {
  throw unrecognizedOperation(operation)
}

export function makeRunner(...middlewares: Middleware[]) {
  checkMiddlewares(middlewares)

  const run = [...middlewares, callMiddleware, contextMiddleware]
    .map(middleware => (next: Next): Next => (ctx, run) => {
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

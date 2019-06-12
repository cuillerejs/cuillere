/* eslint-disable no-await-in-loop */
import { unrecognizedOperation } from './errors'
import { contextMiddleware, callMiddleware, checkMiddlewares, Middleware } from './middlewares'

export interface Run {
  (operation: any): Promise<any>
}

export interface RunFactory {
  (ctx: any, run: Run): Run
}

const finalFactory: RunFactory = () => operation => {
  throw unrecognizedOperation(operation)
}

export function makeRunner(...middlewares: Middleware[]): (ctx: any) => Run {
  checkMiddlewares(middlewares)

  const run = [...middlewares, callMiddleware, contextMiddleware]
    .map(middleware => (nextFactory: RunFactory): RunFactory => (ctx, run) => {
      const middlewareWithNext = middleware(nextFactory(ctx, run))
      return operation => middlewareWithNext(operation, ctx, run)
    })
    .reduceRight((nextFactory, makePrevFactory) => makePrevFactory(nextFactory), finalFactory)

  return (ctx?) => {
    const runCtx = ctx || {}
    const runWithContext = run(runCtx, operation => runWithContext(operation))
    return runWithContext
  }
}

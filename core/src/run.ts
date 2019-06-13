import { unrecognizedOperation } from './errors'
import { contextMiddleware, callMiddleware, checkMiddlewares, Middleware } from './middlewares'

export const START = Symbol('START')
export const STOP = Symbol('STOP')

export interface Run {
  (operation: any): Promise<any>
}

export interface RunFactory {
  (ctx: any, run: Run): Run
}

const finalFactory: RunFactory = () => async operation => {
  if (operation === START || operation === STOP) return
  throw unrecognizedOperation(operation)
}

export function makeRunner(...middlewares: Middleware[]): (ctx?: any) => Run {
  checkMiddlewares(middlewares)

  const run = [...middlewares, callMiddleware, contextMiddleware]
    .map(middleware => (nextFactory: RunFactory): RunFactory => (ctx, run) => {
      const middlewareWithNext = middleware(nextFactory(ctx, run))
      return operation => middlewareWithNext(operation, ctx, run)
    })
    .reduceRight((nextFactory, makePrevFactory) => makePrevFactory(nextFactory), finalFactory)

  return (ctx) => {
    const runCtx = ctx || {}

    const runWithContext = run(runCtx, operation => runWithContext(operation))

    return async (operation) => {
      await runWithContext(START)
      const res = await runWithContext(operation)
      await runWithContext(STOP)
      return res
    }
  }
}

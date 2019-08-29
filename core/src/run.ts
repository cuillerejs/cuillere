import { unrecognizedOperation } from './errors'
import { contextMiddleware, callMiddleware, concurrentMiddleware, checkMiddlewares, Middleware } from './middlewares'

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

export interface Run {
  (operation: any): Promise<any>
}

export interface RunFactory {
  (ctx: any, run: Run): Run
}

const finalFactory: RunFactory = (_ctx, run) => (operation) => {
  if (isStart(operation)) return run(operation.operation)
  throw unrecognizedOperation(operation)
}

export function makeRunner(...middlewares: Middleware[]): (ctx?: any) => Run {
  checkMiddlewares(middlewares)

  const run = [...middlewares, concurrentMiddleware, callMiddleware, contextMiddleware]
    .map(middleware => (nextFactory: RunFactory): RunFactory => (ctx, run) => {
      const middlewareWithNext = middleware(nextFactory(ctx, run))
      return operation => middlewareWithNext(operation, ctx, run)
    })
    .reduceRight((nextFactory, makePrevFactory) => makePrevFactory(nextFactory), finalFactory)

  return (ctx) => {
    const runCtx = ctx || {}
    const runWithContext = run(runCtx, operation => runWithContext(operation))
    return operation => runWithContext(start(operation))
  }
}

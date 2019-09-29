import { unrecognizedOperation } from './errors'
import { contextMiddleware, callMiddleware, concurrentMiddleware, checkMiddlewares, Middleware, Middleware2, call } from './middlewares'
import { GeneratorFunc, Generator } from './utils/generator';

const START = Symbol('START')
const STARTED = Symbol('STARTED')

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

const finalMiddleware: Middleware2 = (_next, ctx, cllr) => operation => {
  if (isStart(operation) && !ctx[STARTED]) {
    ctx[STARTED] = true
    return cllr.run(ctx)(operation.operation)
  }
  throw unrecognizedOperation(operation)
}

// FIXME rename
export interface OperationHandler {
  (operation: any): Promise<any>
}

export interface RunFactory {
  (ctx: any, run: OperationHandler): OperationHandler
}

const finalFactory: RunFactory = (_ctx, run) => (operation) => {
  if (isStart(operation)) return run(operation.operation)
  throw unrecognizedOperation(operation)
}

export function makeRunner(...middlewares: Middleware[]): (ctx?: any) => OperationHandler {
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

export interface Cuillere {
  run: (ctx?: any) => OperationHandler
  execute: <R>(gen: Generator<R>, ctx?: any) => Promise<any>
}

export default function makeCuillere(...middlewares: Middleware2[]): Cuillere {
  // checkMiddlewares(middlewares)

  const cllr: Cuillere = {
    run: ctx => {
      const runCtx = ctx || {}
      return middlewares.reduceRight((next, prev) => prev(next, runCtx, cllr), finalMiddleware(null, runCtx, cllr))
    },
    execute: (gen, ctx) => cllr.run(ctx)(call(gen)),
  }

  return cllr
}
/* eslint-disable no-await-in-loop */
import { compose } from './compose'
import { unrecognizedOperation } from './errors'
import {
  contextMiddleware,
  callMiddleware,
  checkMiddlewares,
  Middleware,
  Runner,
} from './middlewares'

export interface RunnerRef {
  run?: Runner
}

const finalRunner: Runner = operation => {
  throw unrecognizedOperation(operation)
}

export function makeRunner(...middlewares: Middleware[]) {
  checkMiddlewares(middlewares)
  const runnerReference: RunnerRef = {}
  runnerReference.run = compose(
    ...middlewares,
    callMiddleware(runnerReference),
    contextMiddleware,
  )(finalRunner)

  return (operation: any, ctx?: Record<string, any>) => runnerReference.run(operation, ctx || {})
}

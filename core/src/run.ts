/* eslint-disable no-await-in-loop */
import { compose } from './compose'
import { unrecognizedOperation } from './errors'
import { checkMiddlewares, Middleware, Runner } from './middlewares'
import { callMiddleware } from './middlewares/call-middleware'

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
  )(finalRunner)

  return (operation: any, ctx?: Record<string, any>) => runnerReference.run(operation, ctx || {})
}

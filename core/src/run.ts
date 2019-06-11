/* eslint-disable no-await-in-loop */
import { isCall } from './operations'
import { compose } from './compose'
import { error, unrecognizedOperation, isUnrecognizedOperation } from './errors'
import { checkMiddlewares, Middleware, Runner } from './middlewares'

interface RunnerRef {
  run?: Runner
}

/*
  The final runner handles the 'call' operations by running it's function `func`.
  `func` should return an Iterable yielding operations.

  This runner will throw if the given operation isn't a `call`. This means a middleware
  should handle other custom operations.
*/
function finalRunner(runnerRef: RunnerRef): Runner {
  return async function(operation, ctx) {
    const { run } = runnerRef

    if (!isCall(operation)) {
      throw unrecognizedOperation(operation)
    }

    if (!operation.func) {
      throw error(`the call operation function is null or undefined`)
    }

    const runningCall = operation.func(...operation.args)

    if (!runningCall.next) {
      throw error(
        `the call operation function should return an Iterable. You probably used 'function' instead of 'function*'`,
      )
    }

    let current = runningCall.next()
    while (!current.done) {
      current = runningCall.next(await run(current.value, ctx))
    }

    // The last value can be an operation or the return value
    // We try to run it in case it's an operation
    try {
      return await run(current.value, ctx)
    } catch (err) {
      if (isUnrecognizedOperation(err)) return current.value
      throw err
    }
  }
}

export function makeRunner(...middlewares: Middleware[]) {
  checkMiddlewares(middlewares)
  const runnerReference: RunnerRef = {}
  runnerReference.run = compose(...middlewares)(finalRunner(runnerReference))

  return (operation: any, ctx?: Record<string, any>) => runnerReference.run(operation, ctx || {})
}

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

    let current, res
    do {
      current = runningCall.next(res)

      try {
        res = await run(current.value, ctx)
      } catch (e) {
        if (!isUnrecognizedOperation(e)) {
          throw e
        }
        res = current.value
        if (!current.done) console.warn(`${e.message}:`, e.operation)
      }
    } while (!current.done)

    return res
  }
}

export function makeRunner(...middlewares: Middleware[]) {
  checkMiddlewares(middlewares)
  const runnerReference: RunnerRef = {}
  runnerReference.run = compose(...middlewares)(finalRunner(runnerReference))

  return (operation: any, ctx?: Record<string, any>) => runnerReference.run(operation, ctx || {})
}

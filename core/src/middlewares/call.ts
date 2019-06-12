import { Middleware } from './index'
import { isCall } from '../operations'
import { error, isUnrecognizedOperation } from '../errors'
import { RunnerRef } from '../run'

export function callMiddleware(runnerRef: RunnerRef): Middleware {
  return next =>
    async function(operation, ctx) {
      const { run } = runnerRef

      if (!isCall(operation)) {
        return next(operation, ctx)
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
            runningCall.throw(e)
          }
          res = current.value
          if (!current.done) console.warn(`${e.message}:`, e.operation)
        }
      } while (!current.done)

      return res
    }
}

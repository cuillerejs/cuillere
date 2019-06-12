import { Middleware } from './index'
import { isCall } from '../operations'
import { error, isUnrecognizedOperation } from '../errors'

export const callMiddleware: Middleware = next =>
  async function(operation, ctx, run) {
    if (!isCall(operation)) {
      return next(operation)
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
        res = await run(current.value)
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

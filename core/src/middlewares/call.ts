import { Middleware } from './index'
import { isCall } from '../operations'
import { error } from '../errors'

export const callMiddleware: Middleware = next =>
  async function(operation, _ctx, run) {
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

    let current: IteratorResult<any>
    let hasThrown: boolean = false
    let res: any, err: any

    while (true) {
      current = hasThrown ? await runningCall.throw(err) : await runningCall.next(res)

      if (current.done) return current.value
      
      try {
        res = await run(current.value)
        hasThrown = false
      } catch (e) {
        err = e
        hasThrown = true
      }
    }
  }

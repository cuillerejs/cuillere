import { Middleware } from './index'
import { error } from '../errors'

const CALL_SYMBOL = Symbol('CALL')

type Generator<R> = Iterator<R> | AsyncIterator<R>

type CallFunc<Args extends any[], R> = (...args: Args) => Generator<R>

export interface Call<Args extends any[], R> {
  [CALL_SYMBOL]: true
  func: CallFunc<Args, R> | Generator<R>
  args?: Args
}

export function isCall(operation: any): operation is Call<any, any> {
  return operation && operation[CALL_SYMBOL]
}

export function call<Args extends any[], R>(func: CallFunc<Args, R> | Generator<R>, ...args: Args): Call<Args, R> {
  return { [CALL_SYMBOL]: true, func, args }
}

const isGenerator = (value: any): value is Generator<any> => value.next && value.throw

export const callMiddleware: Middleware = next => async (operation, _ctx, run)=> {
  if (!isCall(operation)) {
    return next(operation)
  }

  if (!operation.func) {
    throw error(`the call operation function is null or undefined`)
  }

  const runningCall = isGenerator(operation.func) ? operation.func : operation.func(...operation.args)

  if (!isGenerator(runningCall)) {
    throw error(
      `the call operation function should return a Generator. You probably used 'function' instead of 'function*'`,
    )
  }

  let current: IteratorResult<any>
  let hasThrown = false
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

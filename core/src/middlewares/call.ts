import { Middleware } from './middleware'
import { error } from '../errors'
import { OperationHandler } from '../cuillere'
import { Generator, GeneratorFunc } from '../utils/generator'

const CALL_SYMBOL = Symbol('CALL')

export interface Call<Args extends any[], R> {
  [CALL_SYMBOL]: true
  func: GeneratorFunc<Args, R> | Generator<R>
  args?: Args
  fork?: true
}

export function isCall(operation: any): operation is Call<any, any> {
  return operation && operation[CALL_SYMBOL]
}

export function call<Args extends any[], R>(func: GeneratorFunc<Args, R> | Generator<R>, ...args: Args): Call<Args, R> {
  return { [CALL_SYMBOL]: true, func, args }
}

export function fork<Args extends any[], R>(func: GeneratorFunc<Args, R> | Generator<R>, ...args: Args): Call<Args, R> {
  return { [CALL_SYMBOL]: true, func, args, fork: true }
}

const isGenerator = (value: any): value is Generator<any> => value.next && value.throw

export const callMiddleware = (): Middleware => (next, _ctx, run) => async operation => {
  if (!isCall(operation)) return next(operation)

  const promise = doCall(operation, run)

  return operation.fork ? { promise } : promise
}

const doCall = async <Args extends any[], R>({ func, args }: Call<Args, R>, run: OperationHandler): Promise<R> => {
  if (!func) {
    throw error(`the call operation function is null or undefined`)
  }

  const runningCall = isGenerator(func) ? func : func(...args)

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

import { Middleware } from './middleware'
import { error } from '../errors'
import { OperationHandler } from '../cuillere'
import { Generator, GeneratorFunc, isGenerator } from '../generator'

const CALL = Symbol('CALL')

export interface Call<Args extends any[], R> {
  [CALL]: true
  func: GeneratorFunc<Args, R>
  args?: Args
  fork?: true
}

export function isCall(operation: any): operation is Call<any, any> {
  return Boolean(operation && operation[CALL])
}

export function call<Args extends any[], R>(func: GeneratorFunc<Args, R>, ...args: Args): Call<Args, R> {
  return { [CALL]: true, func, args }
}

export function fork<Args extends any[], R>(func: GeneratorFunc<Args, R>, ...args: Args): Call<Args, R> {
  return { [CALL]: true, func, args, fork: true }
}

const EXECUTE = Symbol('EXECUTE')

export interface Execute<R> {
  [EXECUTE]: true
  gen: Generator<R>
}

export function isExecute(operation: any): operation is Execute<any> {
  return Boolean(operation && operation[EXECUTE])
}

export function execute<R>(gen: Generator<R>): Execute<R> {
  return { [EXECUTE]: true, gen }
}

const DEFER = Symbol('DEFER')

export interface Defer {
  [DEFER]: true
  operation: any
}

export function isDefer(operation: any): operation is Defer {
  return Boolean(operation && operation[DEFER])
}

export function defer(operation: any): Defer {
  return {
    [DEFER]: true,
    operation,
  }
}

export const executeMiddleware = (): Middleware => (next, _ctx, run) => async operation => {
  let gen: Generator<any>
  let fork = false

  if (isExecute(operation)) {
    gen = operation.gen

    // FIXME improve error message
    if (!isGenerator(gen)) throw error('gen should be a generator')
  } else {
    if (!isCall(operation)) return next(operation)

    // FIXME improve error message
    if (!operation.func) throw error('the call operation function is null or undefined')

    gen = operation.func(...operation.args)

    // FIXME improve error message
    if (!isGenerator(gen)) throw error('the call operation function should return a Generator. You probably used `function` instead of `function*`')

    fork = Boolean(operation.fork)
  }

  const promise = doExecute(gen, run)

  return fork ? { promise } : promise
}

const doExecute = async <R>(gen: Generator<R>, run: OperationHandler): Promise<R> => {
  let current: IteratorResult<any>
  let hasThrown = false
  let res: any, err: any
  const defers = Array<Defer>()

  try {
    while (true) {
      current = hasThrown ? await gen.throw(err) : await gen.next(res)

      if (current.done) return current.value

      if (isDefer(current.value)) {
        defers.push(current.value)
        continue
      }

      try {
        res = await run(current.value)
        hasThrown = false
      } catch (e) {
        err = e
        hasThrown = true
      }
    }
  } finally {
    let err: any

    for (let i = defers.length - 1; i >= 0; i--) {
      try {
        await run(defers[i].operation)
      } catch (e) {
        err = e
      }
    }

    if (err) throw err
  }
}

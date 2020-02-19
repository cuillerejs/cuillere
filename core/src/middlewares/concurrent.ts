import { Middleware } from './middleware'
import { fork, cancel, call } from '../cuillere'
import { allSettled as promiseAllSettled } from '../utils/promise'

const TYPE = Symbol('TYPE')

const ALL = Symbol('ALL')
const ALL_SETTLED = Symbol('ALL_SETTLED')
const CHAIN = Symbol('CHAIN')

export interface ConcurentOperation {
  [TYPE]: symbol
  values: Iterable<any>,
}

export const all = (values: Iterable<any>): ConcurentOperation => ({
  [TYPE]: ALL,
  values,
})

export const allSettled = (values: Iterable<any>): ConcurentOperation => ({
  [TYPE]: ALL_SETTLED,
  values,
})

export const chain = (values: Iterable<(previousResult: any) => any>): ConcurentOperation => ({
  [TYPE]: CHAIN,
  values,
})

const handlers = {
  async* [CHAIN](functions: Iterable<(previousResult) => any>) {
    let result: any
    for (const f of functions) result = yield f(result)
    return result
  },

  async* [ALL_SETTLED](operations: Iterable<any>) {
    const forks = []
    for (const op of operations) forks.push(yield fork(op))
    return promiseAllSettled(forks.map(({ result }) => result))
  },

  async* [ALL](operations: Iterable<any>) {
    const forks = []
    for (const op of operations) forks.push(yield fork(op))

    try {
      return await Promise.all(forks.map(({ result }) => result))
    } catch (error) {
      const results = await promiseAllSettled(forks.map(cancel))
      error.errors = results.map(({ reason }) => reason).filter(err => err)
      throw error
    }
  },
}

export const concurrentMiddleware = (): Middleware =>
  async function* concurrentMiddleware(operation, _ctx, next) {
    const handler = handlers[operation[TYPE]]
    return yield handler ? call(handler, operation.values) : next(operation)
  }

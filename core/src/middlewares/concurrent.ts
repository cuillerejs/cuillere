import { Middleware } from './middleware'
import { forkOperation, delegate, Task } from '../cuillere'
import { allSettled as promiseAllSettled } from '../utils/promise'

const TYPE = Symbol('TYPE')

const ALL = Symbol('ALL')
const ALL_SETTLED = Symbol('ALL_SETTLED')
const CHAIN = Symbol('CHAIN')

export interface ConcurentOperation {
  [TYPE]: symbol
  values: Iterable<any>
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
    const tasks = []
    for (const op of operations) tasks.push(yield forkOperation(op))
    return promiseAllSettled(tasks.map(({ result }) => result))
  },

  async* [ALL](operations: Iterable<any>) {
    const tasks: Task[] = []
    for (const op of operations) tasks.push(yield forkOperation(op))

    try {
      return await Promise.all(tasks.map(({ result }) => result))
    } catch (error) {
      const results = await promiseAllSettled(tasks.map(fork => fork.cancel()))
      error.errors = results
        .filter(({ status }) => status === 'rejected')
        .map(({ reason }) => reason)
        .filter(reason => reason !== error)
      throw error
    }
  },
}

export const concurrentMiddleware = (): Middleware =>
  async function* concurrentMiddleware(operation) {
    const handler = handlers[operation[TYPE]]
    if (!handler) yield delegate(operation)
    return yield* handler(operation.values)
  }

import { Middleware } from './middleware'
import { Task } from '../task'
import { forkOperation, delegate, makeOperation } from '../operations'
import { allSettled as promiseAllSettled } from '../utils/promise'

export interface ConcurrentOperation {
  operations: Iterable<any>
}

const makeConcurrentOperation = (kind: symbol) => makeOperation(
  kind,
  (operation, operations: Iterable<any>): ConcurrentOperation => ({
    ...operation, operations,
  }),
)

export const [all, isAll] = makeConcurrentOperation(Symbol('ALL'))
export const [allSettled, isAllSettled] = makeConcurrentOperation(Symbol('ALL_SETTLED'))

async function* handleAll(operations: Iterable<any>) {
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
}

async function* handleAllSettled(operations: Iterable<any>) {
  const tasks = []
  for (const op of operations) tasks.push(yield forkOperation(op))
  return promiseAllSettled(tasks.map(({ result }) => result))
}

export const concurrentMiddleware = (): Middleware =>
  async function* concurrentMiddleware(operation) {
    if (isAll(operation)) return yield* handleAll(operation.operations)
    if (isAllSettled(operation)) return yield* handleAllSettled(operation.operations)
    return yield delegate(operation)
  }

import { forkOperation, Operation } from '../operations'
import { Task } from '../task'
import { allSettled as promiseAllSettled } from '../utils/promise'
import { Middleware } from './middleware'

export interface Concurrent extends Operation {
  operations: Iterable<Operation>
}

export const concurrentMiddleware = (): Middleware => ({
  async* all({ operations }: Concurrent) {
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

  async* allSettled({ operations }: Concurrent) {
    const tasks = []
    for (const op of operations) tasks.push(yield forkOperation(op))
    return promiseAllSettled(tasks.map(({ result }) => result))
  },
})

function concurrent(kind: string) {
  const fn = {
    // We need an object because it's the only to set the name of a function
    [kind](operations: Iterable<Operation>): Concurrent {
      return { kind, operations }
    },
  }
  return fn[kind]
}

export const all = concurrent('all')
export const allSettled = concurrent('allSettled')

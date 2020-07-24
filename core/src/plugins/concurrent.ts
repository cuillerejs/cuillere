import { fork, Operation, OperationObject } from '../operations'
import { Task } from '../stack'
import { allSettled as promiseAllSettled } from '../utils/promise'
import { Plugin } from './plugin'

export interface Concurrent extends OperationObject {
  operations: Iterable<Operation>
}

const namespace = '@cuillere/concurrent'

export const concurrentPlugin = (): Plugin => ({
  namespace,

  handlers: {
    async* all({ operations }: Concurrent) {
      const tasks: Task[] = []
      for (const op of operations) tasks.push(yield fork(op))

      try {
        return await Promise.all(tasks.map(({ result }) => result))
      } catch (error) {
        const results = await promiseAllSettled(tasks.map(task => task.cancel()))
        error.errors = results
          .filter(({ status }) => status === 'rejected')
          .map(({ reason }) => reason)
          .filter(reason => reason !== error)
        throw error
      }
    },

    async* allSettled({ operations }: Concurrent) {
      const tasks = []
      for (const op of operations) tasks.push(yield fork(op))
      return promiseAllSettled(tasks.map(({ result }) => result))
    },
  },
})

function concurrent(kind: string) {
  const nsKind = `${namespace}/${kind}`

  const fn = {
    // Set the function name
    [kind](operations: Iterable<Operation>): Concurrent {
      return { kind: nsKind, operations }
    },
  }
  return fn[kind]
}

export const all = concurrent('all')
export const allSettled = concurrent('allSettled')

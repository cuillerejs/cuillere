import { fork, Operation, OperationObject } from '../operations'
import { Stack } from '../stack'
import { allSettled as promiseAllSettled } from '../utils/promise'
import { Middleware } from './middleware'

export interface Concurrent extends OperationObject {
  operations: Iterable<Operation>
}

export const concurrentMiddleware = (): Middleware => ({
  async* all({ operations }: Concurrent) {
    const stacks: Stack[] = []
    for (const op of operations) stacks.push(yield fork(op))

    try {
      return await Promise.all(stacks.map(({ result }) => result))
    } catch (error) {
      const results = await promiseAllSettled(stacks.map(stack => stack.cancel()))
      error.errors = results
        .filter(({ status }) => status === 'rejected')
        .map(({ reason }) => reason)
        .filter(reason => reason !== error)
      throw error
    }
  },

  async* allSettled({ operations }: Concurrent) {
    const stacks = []
    for (const op of operations) stacks.push(yield fork(op))
    return promiseAllSettled(stacks.map(({ result }) => result))
  },
})

function concurrent(kind: string) {
  const fn = {
    // Set the function name
    [kind](operations: Iterable<Operation>): Concurrent {
      return { kind, operations }
    },
  }
  return fn[kind]
}

export const all = concurrent('all')
export const allSettled = concurrent('allSettled')

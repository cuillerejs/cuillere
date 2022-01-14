import { Effect } from './effect'
import { fork, Operation } from './operation'
import { Plugin } from './plugin'
import { type Task } from './task'

const NAMESPACE = '@cuillere/concurrent'

/**
 * @category for operations
 */
export interface ConcurrentOperation<K extends 'all' | 'allSettled'> extends Operation {
  kind: `${typeof NAMESPACE}/${K}`
  effects: Iterable<Effect>
}

/**
 * Creates a new concurrent plugin instance.
 *
 * This is an internal plugin which is automatically added to cuillere.
 *
 * @returns A new concurrent plugin instance.
 * @hidden
 */
export const concurrentPlugin = (): Plugin => ({
  namespace: NAMESPACE,

  handlers: {
    async* all({ effects }: ConcurrentOperation<'all'>) {
      const tasks: Task[] = []
      for (const effect of effects) tasks.push(yield fork(effect))

      try {
        return await Promise.all(tasks.map(({ result }) => result))
      } catch (error) {
        const results = await Promise.allSettled(tasks.map(task => task.cancel()))
        error.errors = results
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map(({ reason }) => reason)
          .filter(reason => reason !== error)
        throw error
      }
    },

    async* allSettled({ effects }: ConcurrentOperation<'allSettled'>) {
      const tasks = []
      for (const effect of effects) tasks.push(yield fork(effect))
      return Promise.allSettled(tasks.map(({ result }) => result))
    },
  },
})

function concurrent<K extends 'all' | 'allSettled'>(kind: K) {
  const fn = {
    // Set the function name
    [kind](effects: Iterable<Effect>): ConcurrentOperation<K> {
      return { kind: `${NAMESPACE}/${kind}`, effects }
    },
  }
  return fn[kind]
}

/**
 * @category for creating effects
 */
export const all = concurrent('all')

/**
 * @category for creating effects
 */
export const allSettled = concurrent('allSettled')

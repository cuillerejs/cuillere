import { Effect } from './effect'
import { fork, Operation } from './operation'
import { Plugin } from './plugin'
import { type Task } from './task'

const NAMESPACE = '@cuillere/concurrent'

/**
 * Concurrent operations execute several effects concurrenlty.
 *
 * @typeParam K Kind of concurrent operation.
 * @category for operations
 */
export interface ConcurrentOperation<K extends 'all' | 'allSettled'> extends Operation {

  /**
   * Kind of concurrent operation.
   */
  kind: `${typeof NAMESPACE}/${K}`

  /**
   * Effects to be executed.
   */
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
 * Executes all `effects` concurrently, each one in a separate [[Task]].
 *
 * Returns when all tasks have ended, or throws immediately when one of the tasks throws an error,
 * see [Promise.all()](https://mdn.io/Promise.all) for more information.
 *
 * @param effects Effects to be executed.
 * @returns A new concurrent operation.
 * @yields An array containing the return values of `effects`.
 * @category for creating effects
 */
export const all = concurrent('all')

/**
 * Executes all `effects` concurrently, each one in a separate [[Task]].
 *
 * Returns when all tasks have ended or thrown an error,
 * see [Promise.allSettled()](https://mdn.io/Promise.allSettled) for more information.
 *
 * @param effects Effects to be executed.
 * @returns A new concurrent operation.
 * @yields An array containing the outcome of each effect, see [Promise.allSettled()](https://mdn.io/Promise.allSettled) return value.
 * @category for creating effects
 */
export const allSettled = concurrent('allSettled')

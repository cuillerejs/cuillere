import { Operation } from './operation'
import { Plugin } from './plugin'
import { Generator } from './generator'
import { Runner } from './runner'

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
  generators: Generator[]
}

/**
 * @hidden
 */
export type ConcurrentOperations = {
  all: ConcurrentOperation<'all'>
  allSettled: ConcurrentOperation<'allSettled'>
}

/**
 * Creates a new concurrent plugin instance.
 *
 * This is an internal plugin which is automatically added to cuillere.
 *
 * @returns A new concurrent plugin instance.
 * @hidden
 */
export const concurrentPlugin = (): Plugin<ConcurrentOperations> => ({
  namespace: NAMESPACE,

  handlers: {
    async all({ generators }, ctx, execute) {
      return Promise.all(generators.map(generator => execute(generator).run()))
    },

    async allSettled({ generators }, ctx, execute) {
      return Promise.allSettled(generators.map(generator => execute(generator).run()))
    },
  },
})

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
export async function* all(generators: Generator[]): Generator<any, ConcurrentOperation<'all'>> {
  return yield { kind: `${NAMESPACE}/all`, generators }
}

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
export async function* allSettled(generators: Generator[]): Generator<any, ConcurrentOperation<'allSettled'>> {
  return yield { kind: `${NAMESPACE}/allSettled`, generators }
}

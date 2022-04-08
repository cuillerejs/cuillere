import { type Operation, type WrapperOperation, fork, terminal } from './operation'
import type { Effect } from './effect'
import type { Plugin } from './plugin'

const namespace = '@cuillere/time'

/**
 * @hidden
 */
export type SleepOperations = {
  sleep: SleepOperation
  after: AfterOperation
}

/**
 * @hidden
 */
export function timePlugin(): Plugin<SleepOperations> {
  return {
    namespace,

    handlers: {
      async* sleep({ delay }: SleepOperation) {
        return new Promise((resolve) => { setTimeout(resolve, delay) })
      },

      * after({ effect, delay }: AfterOperation) {
        yield sleep(delay)
        return yield terminal(effect)
      },
    },
  }
}

/**
 * An operation to sleep during a given delay.
 *
 * @category for operations
 */
export interface SleepOperation extends Operation {

  /**
   * Sleeping delay in milliseconds.
   */
  delay?: number
}

/**
 * Returns after a given delay.
 *
 * @param delay Sleeping time in milliseconds.
 * @returns A new sleep operation.
 * @yields `void`
 * @category for creating effects
 */
export function sleep(delay?: number): SleepOperation {
  return { kind: `${namespace}/sleep`, delay }
}

/**
 * An operation to execute an effect after a given delay.
 *
 * @category for operations
 */
export interface AfterOperation<T extends Effect = Effect> extends WrapperOperation<T> {

  /**
   * Delay before execution in milliseconds.
   */
  delay?: number
}

/**
 * Executes an effect in a separate [[Task]] (see [[fork]]) after a given delay.
 *
 * @param effect Effect to be executed.
 * @param delay Delay before effect execution.
 * @returns A new after operation.
 * @yields A new asynchronous [[Task]].
 * @category for creating effects
 */
export function after<T extends Effect = Effect>(effect: T, delay?: number) {
  return fork({ kind: `${namespace}/after`, effect, delay } as AfterOperation<T>)
}

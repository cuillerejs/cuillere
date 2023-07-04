import { type Operation } from './operation'
import type { Plugin } from './plugin'

const namespace = '@cuillere/time'

/**
 * @hidden
 */
export type SleepOperations = {
  sleep: SleepOperation
  after: AfterOperation<any>
}

/**
 * @hidden
 */
export function timePlugin(): Plugin<SleepOperations> {
  return {
    namespace,

    handlers: {
      async sleep({ delay }: SleepOperation) {
        return new Promise((resolve) => { setTimeout(resolve, delay) })
      },

      async after({ generator, delay }: AfterOperation<any>, ctx, execute) {
        return {
          delayed: new Promise((resolve) => {
            setTimeout(resolve, delay)
          }).then(() => execute(generator).run()),
        }
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
export function* sleep(delay?: number): Generator<SleepOperation, void> {
  yield { kind: `${namespace}/sleep`, delay }
}

/**
 * An operation to execute an effect after a given delay.
 *
 * @category for operations
 */
export interface AfterOperation<T> extends Operation {

  /**
   * Generator to be executed after a delay
   */
  generator: Generator<Operation, T, any>

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
export function* after<T>(generator: Generator<Operation, T>, delay?: number): Generator<AfterOperation<T>, Promise<T>> {
  const { delayed } = (yield { kind: `${namespace}/after`, generator, delay }) as any
  return delayed
}

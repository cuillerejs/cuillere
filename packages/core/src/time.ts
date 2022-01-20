import { fork, terminal } from './operation'
import { Effect } from './effect'

/**
 * Returns after a given delay.
 *
 * @param delay Sleeping time in milliseconds.
 * @returns A new sleep operation.
 * @yields `void`
 * @category for creating effects
 */
export async function* sleep(delay?: number) {
  await new Promise(resolve => (delay ? setTimeout(resolve, delay) : setImmediate(resolve)))
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
export async function* after(effect: Effect, delay?: number) {
  return yield fork(async function* () {
    yield* sleep(delay)
    return yield terminal(effect)
  })
}

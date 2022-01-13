import { fork, terminal } from './operation'
import { Effect } from './effect'

/**
 *
 * @param delay
 * @category for creating effects
 */
export async function* sleep(delay?: number) {
  await new Promise(resolve => (delay ? setTimeout(resolve, delay) : setImmediate(resolve)))
}

/**
 *
 * @param effect
 * @param delay
 * @returns
 * @category for creating effects
 */
export async function* after(effect: Effect, delay?: number) {
  return yield fork(async function* () {
    yield* sleep(delay)
    return yield terminal(effect)
  })
}

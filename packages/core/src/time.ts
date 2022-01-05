import { fork, terminal } from './operation'
import { Effect } from './effect'

export async function* sleep(delay?: number) {
  await new Promise(resolve => (delay ? setTimeout(resolve, delay) : setImmediate(resolve)))
}

export async function* after(effect: Effect, delay?: number) {
  return yield fork(async function* () {
    yield* sleep(delay)
    return yield terminal(effect)
  })
}

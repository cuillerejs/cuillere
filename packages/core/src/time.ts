import { Operation } from './operations'

export async function* sleep(delay?: number) {
  await new Promise(resolve => (delay ? setTimeout(resolve, delay) : setImmediate(resolve)))
}

export async function* after(operation: Operation, delay?: number) {
  yield* sleep(delay)
  return yield operation
}

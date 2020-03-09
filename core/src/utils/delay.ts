import { Operation, call } from '../operations'

export async function* delay(timeout?: number) {
  await new Promise(resolve => (timeout ? setTimeout(resolve, timeout) : setImmediate(resolve)))
}

export async function* delayOperation(operation: Operation, timeout?: number) {
  yield call(delay, timeout)
  return yield operation
}

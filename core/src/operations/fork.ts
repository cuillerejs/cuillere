import { Call, CallFunction } from './call'
import { Operation, Wrapper } from './operation'

export function forkOperation<T extends Operation>(operation: T): Wrapper<T> {
  return {
    kind: 'fork',
    operation,
  }
}

export function fork<Args extends any[], R>(func: CallFunction<Args, R>, ...args: Args): Wrapper<Call> {
  return forkOperation({
    kind: 'call',
    func,
    args,
  })
}

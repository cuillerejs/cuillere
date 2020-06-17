import { CallOperation, CallFunction, call } from './call'
import { Operation, Wrapper, isKind } from './operation'

export function forkOperation<T extends Operation>(operation: T): Wrapper<T> {
  return {
    kind: 'fork',
    operation,
  }
}

export function fork<Args extends any[], R>(func: CallFunction<Args, R>, ...args: Args): Wrapper<CallOperation> {
  return forkOperation(call(func, ...args))
}

export const isFork = isKind<Wrapper>('fork')

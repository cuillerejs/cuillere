import { Operation, Wrapper } from './operation'
import { call, CallFunction } from './call'

export function deferOperation(operation: Operation): Wrapper {
  return {
    kind: 'defer',
    operation,
  }
}

export function defer<Args extends any[], R>(func: CallFunction<Args, R>, ...args: Args) {
  return deferOperation(call(func, ...args))
}

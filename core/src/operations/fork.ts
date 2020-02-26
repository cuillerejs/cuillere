import { makeWrapperOperation } from './operation'
import { call, CallFunction } from './call'

export const [forkOperation, isFork] = makeWrapperOperation(Symbol('FORK'))

export function fork<Args extends any[], R>(func: CallFunction<Args, R>, ...args: Args) {
  return forkOperation(call(func, ...args))
}

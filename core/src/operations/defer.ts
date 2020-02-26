import { makeWrapperOperation } from './operation'
import { call, CallFunction } from './call'

export const [deferOperation, isDefer] = makeWrapperOperation(Symbol('DEFER'))

export function defer<Args extends any[], R>(func: CallFunction<Args, R>, ...args: Args) {
  return deferOperation(call(func, ...args))
}

import { Operation, Wrapper, isKind, isOperation } from './operation'
import { call, CallFunction } from './call'

export function defer<Args extends any[], R>(func: CallFunction<Args, R>, ...args: Args): Wrapper<Operation>
export function defer<Args extends any[], R>(operation: Operation): Wrapper<Operation>

export function defer<Args extends any[], R>(arg0: Operation | CallFunction<Args, R>, ...args: Args) {
  return { kind: 'defer', operation: isOperation(arg0) ? arg0 : call(arg0, ...args) }
}

export const isDefer = isKind<Wrapper>('defer')

import { Operation, Wrapper, isKind, isOperation, validateOperation } from './operation'
import { call, CallFunction } from './call'

export function defer<Args extends any[], R>(func: CallFunction<Args, R>, ...args: Args): Wrapper<Operation>
export function defer<Args extends any[], R>(operation: Operation): Wrapper<Operation>

export function defer<Args extends any[], R>(arg0: Operation | CallFunction<Args, R>, ...args: Args) {
  if (!isOperation(arg0)) return { kind: 'defer', operation: call(arg0, ...args) }

  const operation = validateOperation(arg0)

  return { kind: 'defer', operation }
}

export const isDefer = isKind<Wrapper>('defer')

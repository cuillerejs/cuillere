import { GeneratorFunction } from '../generator'
import { Operation, Wrapper, isOfKind, isOperation } from './operation'
import { call } from './call'

export function defer<Args extends any[], R>(func: GeneratorFunction<Args, R>, ...args: Args): Wrapper<Operation>
export function defer<Args extends any[], R>(operation: Operation): Wrapper<Operation>

export function defer<Args extends any[], R>(arg0: Operation | GeneratorFunction<Args, R>, ...args: Args) {
  return { kind: 'defer', operation: isOperation(arg0) ? arg0 : call(arg0, ...args) }
}

export const isDefer = isOfKind<Wrapper>('defer')

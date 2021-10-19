import { GeneratorFunction } from '../generator'
import { call } from './call'
import { Operation, Wrapper, isOfKind, isOperation, coreNamespace } from './operation'

const kind = `${coreNamespace}/fork`

export function fork<Args extends any[], R>(func: GeneratorFunction<Args, R>, ...args: Args): Wrapper<Operation>
export function fork(operation: Operation): Wrapper<Operation>

export function fork<Args extends any[], R>(arg0: Operation | GeneratorFunction<Args, R>, ...args: Args) {
  return { kind, operation: isOperation(arg0) ? arg0 : call(arg0, ...args) }
}

export const isFork = isOfKind<Wrapper>(kind)

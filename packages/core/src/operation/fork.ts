import { type CallOperation, call } from './call'
import { CORE_NAMESPACE } from '../core-namespace'
import { type Effect, isEffect } from '../effect'
import { GeneratorFunction } from '../generator'
import { type WrapperOperation } from './wrapper'

const kind = `${CORE_NAMESPACE}/fork`

export function fork<Args extends any[], R>(func: GeneratorFunction<Args, R>, ...args: Args): WrapperOperation<CallOperation>
export function fork<T extends Effect>(effect: T): WrapperOperation<T>

export function fork<Args extends any[], R>(arg0: Effect | GeneratorFunction<Args, R>, ...args: Args) {
  return { kind, effect: isEffect(arg0) ? arg0 : call(arg0, ...args) }
}

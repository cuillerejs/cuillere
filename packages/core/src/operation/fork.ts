import { type CallOperation, call } from './call'
import { CORE_NAMESPACE } from '../core-namespace'
import { type Effect, isEffect } from '../effect'
import { GeneratorFunction } from '../generator'
import { type WrapperOperation } from './wrapper'

export function fork<Args extends any[], R>(func: GeneratorFunction<Args, R>, ...args: Args): WrapperOperation<CallOperation>
export function fork<T extends Effect>(effect: T): WrapperOperation<T>

/**
 *
 * @param arg0
 * @param args
 * @returns
 * @category for creating effects
 */
export function fork<Args extends any[], R>(arg0: Effect | GeneratorFunction<Args, R>, ...args: Args): WrapperOperation {
  return {
    kind: `${CORE_NAMESPACE}/fork`,
    effect: isEffect(arg0) ? arg0 : call(arg0, ...args),
  }
}

import { type CallOperation, call } from './call'
import { CORE_NAMESPACE } from '../core-namespace'
import { type Effect, isEffect } from '../effect'
import { type GeneratorFunction } from '../generator'
import { type WrapperOperation } from './wrapper'

/**
 * Defers a call to a generator function until the current generator returns or throws.
 *
 * Shorthand for:
 *
 * ```javascript
 * yield defer(call(func, ...args))
 * ```
 *
 * Multiple defers are executed in reverse order (last yielded first executed).
 *
 * @param func Generator function to be called.
 * @param args Generator function's arguments.
 * @typeParam Args Generator function's arguments type.
 * @yields `void`
 */
export function defer<Args extends any[]>(func: GeneratorFunction<Args>, ...args: Args): WrapperOperation<CallOperation>

/**
 * Defers an effect until the current generator returns or throws.
 *
 * Multiple defers are executed in reverse order (last yielded first executed).
 *
 * @param effect Effect to be deferred.
 * @typeParam T Effect's type.
 * @yields `void`
 */
export function defer<T extends Effect>(effect: T): WrapperOperation<T>

/**
 * @returns A new defer operation.
 * @category for creating effects
 */
export function defer<Args extends any[], R>(arg0: Effect | GeneratorFunction<Args, R>, ...args: Args): WrapperOperation {
  return { kind: `${CORE_NAMESPACE}/defer`, effect: isEffect(arg0) ? arg0 : call(arg0, ...args) }
}

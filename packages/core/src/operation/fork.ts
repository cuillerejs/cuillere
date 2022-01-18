import { type CallOperation, call } from './call'
import { CORE_NAMESPACE } from '../core-namespace'
import { type Effect, isEffect } from '../effect'
import { GeneratorFunction } from '../generator'
import { type WrapperOperation } from './wrapper'

/**
 * Executes a generator function in a separate asynchronous [[Task]].
 *
 * @param func Generator function to be executed.
 * @param args Generator function's arguments.
 * @typeParam Args Generator function's arguments type.
 * @yields A new asynchronous [[Task]].
 */
export function fork<Args extends any[]>(func: GeneratorFunction<Args>, ...args: Args): WrapperOperation<CallOperation>

/**
 * Executes an effect in a separate asynchronous [[Task]].
 *
 * @param effect
 * @typeParam T Effect's type.
 * @yields A new asynchronous [[Task]].
 */
export function fork<T extends Effect>(effect: T): WrapperOperation<T>

/**
 * @returns A new fork operation.
 * @category for creating effects
 */
export function fork<Args extends any[], R>(arg0: Effect | GeneratorFunction<Args, R>, ...args: Args): WrapperOperation {
  return {
    kind: `${CORE_NAMESPACE}/fork`,
    effect: isEffect(arg0) ? arg0 : call(arg0, ...args),
  }
}

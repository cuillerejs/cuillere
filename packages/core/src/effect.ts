import { type Generator, isGenerator } from './generator'
import { type Operation, isOperation } from './operation'

/**
 * Effect is a union of all yieldable types.
 *
 * @typeParam R Effect's return type.
 */
export type Effect<R = any> = Operation | Generator<R>

/**
 * Checks if `value` is an [[Effect]].
 *
 * `value` must not be `null` or `undefined`.
 *
 * @param value Value to be checked.
 * @returns `true` if value is an [[Effect]], `false` otherwise.
 */
export function isEffect(value: any): value is Effect {
  return isOperation(value) || isGenerator(value)
}

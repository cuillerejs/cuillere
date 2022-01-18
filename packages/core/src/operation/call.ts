import { CORE_NAMESPACE } from '../core-namespace'
import { GeneratorFunction } from '../generator'
import { Operation } from './operation'

/**
 * An operation to call a given generator function when yielded.
 *
 * Use [[call]] to create a `CallOperation`.
 *
 * @category for operations
 */
export interface CallOperation extends Operation {

  /**
   * Generator function to be called.
   */
  func: GeneratorFunction

  /**
   * Arguments for the generator function.
   */
  args?: any[]
}

/**
 * Calls a generator function with the given arguments and yields its result.
 *
 * Example:
 *
 * ```javascript
 * const result = yield call(exampleGeneratorFunction, arg1, arg2)
 * ```
 *
 * This has the same effect as yielding a generator returned by actually calling the generator function,
 * however it allows cuillere, or any registered plugin, wider possibilities by exposing the generator function and its arguments.
 *
 * @param func Generator function to be called.
 * @param args Arguments for the generator function.
 * @typeParam Args Arguments type.
 * @returns A new call operation.
 * @yields The value returned by `func`.
 * @category for creating effects
 */
export function call<Args extends any[]>(func: GeneratorFunction<Args>, ...args: Args): CallOperation {
  return { kind: `${CORE_NAMESPACE}/call`, func, args }
}

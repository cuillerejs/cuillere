import { type Effect } from '../effect'
import { type Operation } from './operation'

/**
 * Base interface for any wrapper operation object.
 *
 * Wrapper operations add some behaviour to another effect.
 *
 * @typeParam Wrapped effect's type.
 * @category for operations
 */
export interface WrapperOperation<T extends Effect = Effect> extends Operation {

  /**
   * Wrapped effect.
   */
  readonly effect: T
}

/**
 * Checks if operation is a [[WrapperOperation]].
 *
 * ⚠️ Doesn't check if `operation` is actually an [[Operation]], i.e. has a `kind` property.
 *
 * @param operation Operation to be checked, must not be `null` or `undefined`.
 * @returns `true` if `operation` has an `effect` property.
 */
export function isWrapperOperation(operation: Operation): operation is WrapperOperation {
  return 'effect' in operation
}

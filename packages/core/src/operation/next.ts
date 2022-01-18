import { CORE_NAMESPACE } from '../core-namespace'
import { type Effect } from '../effect'
import { type WrapperOperation } from './wrapper'

const kind = `${CORE_NAMESPACE}/next` as const

/**
 * An operation allowing a [[HandlerFunction | handler]] to forward the current operation to the next handler.
 *
 * ⚠ This operation cannot be yielded outside of a handler.
 *
 * @typeParam T Forwarded effect's type.
 * @category for operations
 */
export interface NextOperation<T extends Effect = Effect> extends WrapperOperation<T> {

  /**
   * If true, the current handler is terminated and replaced by the next handler in the stack, see [[delegate]] for more information.
   */
  terminal?: true
}

/**
 * Forwards the current operation to the next [[HandlerFunction | handler]].
 *
 * @param effect Effect to be forwarded.
 * @typeParam T Effect's type.
 * @returns A new next operation.
 * @yields The value returned by the next handler.
 * @category for creating effects
 */
export function next<T extends Effect = Effect>(effect: T): NextOperation<T> {
  return { kind, effect }
}

/**
 * Delegates the current operation to the next [[HandlerFunction | handler]].
 *
 * The current handler is terminated and replaced by the next handler in the stack,
 * this means the current handler should not use [[defer]] or [`try...finaly`](https://mdn.io/try...catch).
 *
 * @param effect Effect to be delegated.
 * @typeParam T Effect's type.
 * @returns A new next operation.
 * @category for creating effects
 */
export function delegate<T extends Effect = Effect>(effect: T): NextOperation<T> {
  return { kind, effect, terminal: true }
}

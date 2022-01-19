import { CORE_NAMESPACE } from '../core-namespace'
import type { Operation } from './operation'
import type { Effect } from '../effect'

const kind = `${CORE_NAMESPACE}/next` as const

/**
 * An operation allowing a [[HandlerFunction | handler]] to forward the current operation to the next handler.
 *
 * ⚠️ This operation cannot be yielded outside of a handler.
 *
 * @typeParam T Forwarded effect's type.
 * @category for operations
 */
export interface NextOperation<T extends Effect = Effect> extends Operation {

  /**
   * Forwarded effect, if omitted the current operation is used.
   */
  readonly effect?: T

  /**
   * If true, the current handler is stopped and replaced by the next handler in the call stack, see [[delegate]] for more information.
   */
  readonly terminal?: true
}

const emptyNext = { kind }

/**
 * Forwards the current operation to the next [[HandlerFunction | handler]].
 *
 * A modified effect may be given parameter, the modified effect must have the same kind as the current operation.
 *
 * @param effect Modified effect to be forwarded.
 * @typeParam T Effect's type.
 * @returns A new next operation.
 * @yields The value returned by the next handler.
 * @category for creating effects
 */
export function next<T extends Effect = Effect>(effect?: T): NextOperation<T> {
  return effect == null ? emptyNext : { kind, effect }
}

const emptyDelegate = { kind, terminal: true as const }

/**
 * Delegates the current operation to the next [[HandlerFunction | handler]].
 *
 * The current handler is stopped and replaced by the next handler in the call stack,
 * this means the current handler must not use [[defer]] or [`try...finaly`](https://mdn.io/try...catch).
 *
 * A modified effect may be given parameter, the modified effect must have the same kind as the current operation.
 *
 * @param effect Modified effect to be delegated.
 * @typeParam T Effect's type.
 * @returns A new next operation.
 * @category for creating effects
 */
export function delegate<T extends Effect = Effect>(effect?: T): NextOperation<T> {
  return effect == null ? emptyDelegate : { kind, effect, terminal: true }
}

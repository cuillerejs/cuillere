import { CORE_NAMESPACE } from '../core-namespace'
import { type Effect } from '../effect'
import { type WrapperOperation } from './wrapper'

/**
 * An operation executed once before the first effect is executed.
 *
 * ⚠ DO NOT USE THIS OPERATION.
 *
 * This internal operation is used to wrap the first effect when at least one plugin registrered a handler for `"@cuillere/core/start"`.
 *
 * @param effect The first effect.
 * @typeParam T Type of the effect.
 * @returns A start operation wrapping the first effect.
 * @hidden
 */
export function start<T extends Effect>(effect: T): WrapperOperation<T> {
  return { kind: `${CORE_NAMESPACE}/start`, effect }
}

import { CORE_NAMESPACE } from '../core-namespace'
import { Effect } from '../effect'

/**
 * Stops the current generator and replaces it by the handler for `effect` in the call stack.
 *
 * The current generator must not use [[defer]] or [`try...finaly`](https://mdn.io/try...catch).
 *
 * @param effect Effect to be executed.
 * @typeParam T Effect's type.
 * @returns A new terminal effect.
 * @category for creating effects
 */
export function terminal<T extends Effect>(effect: T): YieldType<never> {
  return { kind: `${CORE_NAMESPACE}/terminal`, effect }
}

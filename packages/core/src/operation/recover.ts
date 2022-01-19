import { CORE_NAMESPACE } from '../core-namespace'
import { Operation } from './operation'

const recoverOperation: Operation = Object.freeze({ kind: `${CORE_NAMESPACE}/recover` })

/**
 * Recovers from an error in the calling generator function, if any was thrown.
 *
 * ⚠️️ Must be called in a [[defer | deffered]] function.
 *
 * @returns The recover operation.
 * @yields The error thrown in the calling generator function if any, otherwise `undefined`.
 * @category for creating effects
 */
export function recover() {
  return recoverOperation
}

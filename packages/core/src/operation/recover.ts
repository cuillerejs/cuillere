import { CORE_NAMESPACE } from '../core-namespace'
import { Operation } from './operation'

const recoverOperation: Operation = Object.freeze({ kind: `${CORE_NAMESPACE}/recover` })

/**
 *
 * @returns
 * @category for creating effects
 */
export function recover() {
  return recoverOperation
}

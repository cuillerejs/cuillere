import { CORE_NAMESPACE } from '../core-namespace'
import { Operation } from './operation'

const generatorOperation: Operation = Object.freeze({ kind: `${CORE_NAMESPACE}/generator` })

/**
 * Returns the current generator.
 *
 * @returns The generator operation.
 * @yields The current generator.
 * @hidden
 */
export function generator() {
  return generatorOperation
}

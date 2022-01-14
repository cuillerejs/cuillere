import { CORE_NAMESPACE } from '../core-namespace'
import { Operation } from './operation'

const generatorOperation: Operation = Object.freeze({ kind: `${CORE_NAMESPACE}/generator` })

/**
 * Returns the current generator.
 *
 * @returns An operation that returns the current generator when yielded.
 * @hidden
 */
export function generator() {
  return generatorOperation
}

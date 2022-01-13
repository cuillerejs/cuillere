import { CORE_NAMESPACE } from '../core-namespace'
import { Operation } from './operation'

const generatorOperation: Operation = Object.freeze({ kind: `${CORE_NAMESPACE}/generator` })

/**
 * @internal
 */
export function generator() { return generatorOperation }

import { CORE_NAMESPACE } from '../core-namespace'
import { Operation } from './operation'

const generatorOperation: Operation = Object.freeze({ kind: `${CORE_NAMESPACE}/generator` })

export function generator() { return generatorOperation }

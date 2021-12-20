import { coreNamespace } from './core-namespace'
import { Operation } from './operation'

const generatorOperation: Operation = Object.freeze({ kind: `${coreNamespace}/generator` })

export function generator() { return generatorOperation }

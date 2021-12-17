import { Operation, coreNamespace } from './operation'

const generatorOperation: Operation = Object.freeze({ kind: `${coreNamespace}/generator` })

export function generator() { return generatorOperation }

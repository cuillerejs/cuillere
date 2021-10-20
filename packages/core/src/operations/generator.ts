import { OperationObject, coreNamespace } from './operation'

const generatorOperation: OperationObject = Object.freeze({ kind: `${coreNamespace}/generator` })

export function generator() { return generatorOperation }

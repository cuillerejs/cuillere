import { OperationObject } from './operation'

const generatorOperation: OperationObject = Object.freeze({ kind: 'generator' })

export function generator() { return generatorOperation }

import { coreNamespace } from './core-namespace'
import { Operation } from './operation'

const kind = `${coreNamespace}/recover`

const recoverOperation: Operation = Object.freeze({ kind })

export function recover() {
  return recoverOperation
}

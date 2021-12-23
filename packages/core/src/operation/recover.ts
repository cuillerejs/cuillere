import { CORE_NAMESPACE } from '../core-namespace'
import { Operation } from './operation'

const kind = `${CORE_NAMESPACE}/recover`

const recoverOperation: Operation = Object.freeze({ kind })

export function recover() {
  return recoverOperation
}

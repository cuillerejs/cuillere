import { OperationObject, isOfKind, coreNamespace } from './operation'

const kind = `${coreNamespace}/recover`

const recoverOperation: OperationObject = Object.freeze({ kind })

export function recover() {
  return recoverOperation
}

export const isRecover = isOfKind(kind)

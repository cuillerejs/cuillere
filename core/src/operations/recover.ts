import { OperationObject, isOfKind } from './operation'

const recoverOperation: OperationObject = Object.freeze({ kind: 'recover' })

export function recover() {
  return recoverOperation
}

export const isRecover = isOfKind('recover')

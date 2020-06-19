import { OperationObject, isKind } from './operation'

const recoverOperation: OperationObject = Object.freeze({ kind: 'recover' })

export function recover() {
  return recoverOperation
}

export const isRecover = isKind('recover')

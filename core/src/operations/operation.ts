import { Generator } from '../generator'

export interface OperationObject {
  readonly kind: string
}

export type Operation = OperationObject | Generator

export function isOperationObject(operation: Operation): operation is OperationObject {
  return 'kind' in operation
}

export function isKind<T extends OperationObject>(kind: string) {
  return function (operation: Operation): operation is T {
    return isOperationObject(operation) && operation.kind === kind
  }
}

export interface Wrapper<T extends Operation = Operation> extends OperationObject {
  readonly operation: T
}

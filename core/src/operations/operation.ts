import { Generator, isGenerator } from '../generator'

export interface OperationObject {
  readonly kind: string
}

export type Operation = OperationObject | Generator

export function isOperation(value: any): value is Operation {
  return isOperationObject(value) || isGenerator(value)
}

export function isOperationObject(value: any): value is OperationObject {
  return 'kind' in value
}

export function isKind<T extends OperationObject>(kind: string) {
  return function (operation: Operation): operation is T {
    return isOperationObject(operation) && operation.kind === kind
  }
}

export interface Wrapper<T extends Operation = Operation> extends OperationObject {
  readonly operation: T
}

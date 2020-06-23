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

export function isWrapper(operation: Operation): operation is Wrapper {
  return 'operation' in operation
}

export function validateOperation(value: any): Operation {
  if (value === undefined || value === null) throw new TypeError(`${value} operation is forbidden`)

  if (!isOperation(value)) throw new TypeError(`${value} is neither an operation nor a generator`)

  if (isWrapper(value)) validateOperation(value.operation)

  return value
}

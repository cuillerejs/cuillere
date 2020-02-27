const KIND = Symbol('KIND')

export type Operation = object

export function makeOperation<T extends Operation, Args extends any[] = []>(
  kind: symbol,
  extender?: (operation: Operation, ...args: Args) => T,
): [
  (...args: Args) => T,
  (operation: any) => operation is T
] {
  return [
    (...args) => {
      const operation = { [KIND]: kind }
      return extender ? extender(operation, ...args) : operation as T
    },
    (operation): operation is T => operation?.[KIND] === kind,
  ]
}

export interface WrapperOperation extends Operation {
  readonly operation: any
}

export function makeWrapperOperation<T extends WrapperOperation, Args extends any[] = []>(
  kind: symbol,
  extender?: (operation: WrapperOperation, ...args: Args) => T,
): [
  (operation: any, ...args: Args) => T,
  (operation: any) => operation is T
] {
  return makeOperation(
    kind,
    (operation, wrapped: Operation, ...args: Args): T => {
      const base = { ...operation, operation: wrapped }
      return extender ? extender(base, ...args) : base as T
    },
  )
}

const KIND = Symbol('KIND')

export interface Operation<S> {
  readonly [KIND]: S
}

export function makeOperation<S, T extends Operation<S>, Args extends any[]>(
  kind: S,
  extender?: (...args: Args) => Omit<T, typeof KIND>,
): [
  (...args: Args) => T,
  (operation: any) => operation is T
] {
  return [
    function wrapper(...args) {
      return {
        [KIND]: kind,
        ...extender && extender(...args),
      } as T
    },
    function isWrapper(operation): operation is T {
      return operation?.[KIND] === kind
    },
  ]
}

export interface WrapperOperation<S> extends Operation<S> {
  readonly operation: any
}

export function makeWrapperOperation<S, T extends WrapperOperation<S>, Args extends any[]>(
  kind: S,
  extender?: (...args: Args) => Omit<T, typeof KIND | 'operation'>,
) {
  return makeOperation(
    kind,
    (operation, ...args: Args) => ({
      operation,
      ...extender && extender(...args),
    } as Omit<T, typeof KIND>),
  )
}

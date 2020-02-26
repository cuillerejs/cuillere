const WRAPPER = Symbol('WRAPPER')

export interface Wrapper<T> {
  readonly [WRAPPER]: T
  readonly operation: any
}

export function makeWrapper<S, T extends Wrapper<S>, Args extends any[]>(
  kind: S,
  extender?: (...args: Args) => Omit<Omit<T, typeof WRAPPER>, 'operation'>,
): [
  (operation: any, ...args: Args) => T,
  (operation: any) => operation is T
] {
  return [
    function wrapper(operation, ...args) {
      return {
        [WRAPPER]: kind,
        operation,
        ...extender && extender(...args),
      } as T
    },
    function isWrapper(operation): operation is T {
      return operation?.[WRAPPER] === kind
    },
  ]
}

export interface Operation {
  readonly kind: string
}

export interface Wrapper<T extends Operation = Operation> extends Operation {
  readonly operation: T
}

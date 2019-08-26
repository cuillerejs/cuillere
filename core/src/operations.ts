const CALL_SYMBOL = Symbol('CALL')

export type GeneratorFunction<Args extends any[], R> = (...args: Args) => (IterableIterator<R> | AsyncIterableIterator<R>)

export interface Call {
  [CALL_SYMBOL]: true
  func(...args: any[]): (IterableIterator<any> | AsyncIterableIterator<any>)
  args: any[]
}

export function isCall(operation: any): operation is Call {
  return operation && operation[CALL_SYMBOL]
}

export function call<Args extends any[]>(func: GeneratorFunction<Args, any>, ...args: Args): Call {
  return { [CALL_SYMBOL]: true, func, args }
}

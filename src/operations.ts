const DB_OPERATION_SYMBOL = Symbol('DB_OPERATION')

type GeneratorFunction<Args extends any[], R> = (...args: Args) => IterableIterator<R>

export interface Operation {
  [DB_OPERATION_SYMBOL]: true
  type: string
}

export interface CallOperation extends Operation {
  type: 'CALL'
  func(...args: any[]): IterableIterator<any>
  args: any[]
}

export interface CrudOperation extends Operation {
  type: 'CRUD'
  service: string
  method: string
  args: any[]
}

export function isOperation(operation: any): operation is Operation {
  return operation && operation[DB_OPERATION_SYMBOL]
}

export function isCallOperation(operation: any): operation is CallOperation {
  return isOperation(operation) && operation.type === 'CALL'
}

export function isCrudOperation(operation: any): operation is CrudOperation {
  return isOperation(operation) && operation.type === 'CRUD'
}

export function call<Args extends any[]>(
  func: GeneratorFunction<Args, any>,
  ...args: Args
): CallOperation {
  return { [DB_OPERATION_SYMBOL]: true, type: 'CALL', func, args }
}

export function crud(service: string, method: string, ...args: any[]): CrudOperation {
  return { [DB_OPERATION_SYMBOL]: true, type: 'CRUD', method, service, args }
}

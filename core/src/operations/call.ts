import { GeneratorFunction } from '../generator'
import { Operation, OperationObject } from './operation'
import type { BatchedGeneratorFunction } from '../middlewares'

export interface CallOperation extends OperationObject {
  func: CallFunction
  args?: any[]
}

export type CallFunction<Args extends any[] = any[], R = any> =
  GeneratorFunction<Args, R, Operation> |
  BatchedGeneratorFunction<Args, R>

export function call<Args extends any[], R>(func: CallFunction<Args, R>, ...args: Args): CallOperation {
  return {
    kind: 'call',
    func,
    args,
  }
}

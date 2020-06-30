import { GeneratorFunction } from '../generator'
import { OperationObject } from './operation'

export interface CallOperation extends OperationObject {
  func: GeneratorFunction
  args?: any[]
}

export function call<Args extends any[], R>(func: GeneratorFunction<Args, R>, ...args: Args): CallOperation {
  return {
    kind: 'call',
    func,
    args,
  }
}

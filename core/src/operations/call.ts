import { GeneratorFunction } from '../generator'
import { OperationObject, coreNamespace } from './operation'

export interface CallOperation extends OperationObject {
  func: GeneratorFunction
  args?: any[]
}

const kind = `${coreNamespace}/call`

export function call<Args extends any[], R>(func: GeneratorFunction<Args, R>, ...args: Args): CallOperation {
  return { kind, func, args }
}

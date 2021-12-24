import { CORE_NAMESPACE } from '../core-namespace'
import { GeneratorFunction } from '../generator'
import { Operation } from './operation'

/**
 * @category for operations
 */
export interface CallOperation extends Operation {
  func: GeneratorFunction
  args?: any[]
}

const kind = `${CORE_NAMESPACE}/call`

export function call<Args extends any[], R>(func: GeneratorFunction<Args, R>, ...args: Args): CallOperation {
  return { kind, func, args }
}

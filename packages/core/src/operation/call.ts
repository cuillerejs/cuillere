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

/**
 * Creates a call operation for the given generator function and arguments.
 * @param func Generator function to be called
 * @param args Arguments for the generator function
 * @typeParam Args Arguments type
 * @returns A new call operation
 */
export function call<Args extends any[]>(func: GeneratorFunction<Args>, ...args: Args): CallOperation {
  return { kind: `${CORE_NAMESPACE}/call`, func, args }
}

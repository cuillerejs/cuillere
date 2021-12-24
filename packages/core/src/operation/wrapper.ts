import { type Effect } from '../effect'
import { type Operation } from './operation'

/**
 * @category for operations
 */
export interface WrapperOperation<T extends Effect = Effect> extends Operation {
  readonly effect: T
}

export function isWrapperOperation(operation: Operation): operation is WrapperOperation {
  return 'effect' in operation
}

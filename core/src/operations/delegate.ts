import { OperationObject } from './operation'
import { next } from './next'
import { terminal } from './terminal'

export function delegate(operation: OperationObject) {
  return terminal(next(operation))
}

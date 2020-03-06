import { Operation } from './operation'
import { next } from './next'
import { terminal } from './terminal'

export function delegate(operation: Operation) {
  return terminal(next(operation))
}

import { terminal } from './terminal'
import { next } from './next'

export function delegate(operation: any) {
  return terminal(next(operation))
}

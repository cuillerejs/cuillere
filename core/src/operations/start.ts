import { Operation, Wrapper } from './operation'

export function start(operation: Operation): Wrapper {
  return {
    kind: 'start',
    operation,
  }
}

import { Operation, Wrapper } from './operation'

export function terminal(operation: Operation): Wrapper {
  return {
    kind: 'terminal',
    operation,
  }
}

export function isTerminal(operation: Operation): operation is Wrapper {
  return operation?.kind === 'terminal'
}

import { Operation, Wrapper, isKind } from './operation'

export function terminal(operation: Operation): Wrapper {
  return {
    kind: 'terminal',
    operation,
  }
}

export const isTerminal = isKind<Wrapper>('terminal')

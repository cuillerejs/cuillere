import { Operation, Wrapper, isOfKind } from './operation'

export function terminal(operation: Operation): Wrapper {
  return { kind: 'terminal', operation }
}

export const isTerminal = isOfKind<Wrapper>('terminal')

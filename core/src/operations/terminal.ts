import { Operation, Wrapper, isKind, validateOperation } from './operation'
import { isFork } from './fork'
import { isDefer } from './defer'

export function terminal(operation: Operation): Wrapper {
  validateOperation(operation)

  if (isFork(operation)) throw new TypeError('terminal forks are forbidden')
  if (isDefer(operation)) throw new TypeError('terminal defers are forbidden')
  if (isTerminal(operation)) throw new TypeError('terminals cannot be nested')

  return {
    kind: 'terminal',
    operation,
  }
}

export const isTerminal = isKind<Wrapper>('terminal')

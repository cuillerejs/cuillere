import { Operation, Wrapper, isOfKind, coreNamespace } from './operation'

const kind = `${coreNamespace}/terminal`

export function terminal(operation: Operation): Wrapper {
  return { kind, operation }
}

export const isTerminal = isOfKind<Wrapper>(kind)

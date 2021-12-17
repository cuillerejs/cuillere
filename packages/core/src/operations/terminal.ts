import { Effect, Wrapper, isOfKind, coreNamespace } from './operation'

const kind = `${coreNamespace}/terminal`

export function terminal(effect: Effect): Wrapper {
  return { kind, effect }
}

export const isTerminal = isOfKind<Wrapper>(kind)

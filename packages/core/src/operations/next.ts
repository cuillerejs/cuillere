import { Effect, Wrapper, isOfKind, coreNamespace } from './operation'

const kind = `${coreNamespace}/next`

export interface NextOperation<T extends Effect = Effect> extends Wrapper<T> {
  terminal?: true
}

export function next<T extends Effect = Effect>(effect: T): NextOperation<T> {
  return { kind, effect }
}

export function delegate<T extends Effect = Effect>(effect: T): NextOperation<T> {
  return { kind, effect, terminal: true }
}

export const isNext = isOfKind<Wrapper<Effect>>(kind)

import { type Effect } from '../effect'
import { coreNamespace, isOfKind } from './operation'
import { type WrapperOperation } from './wrapper'

const kind = `${coreNamespace}/next`

export interface NextOperation<T extends Effect = Effect> extends WrapperOperation<T> {
  terminal?: true
}

export function next<T extends Effect = Effect>(effect: T): NextOperation<T> {
  return { kind, effect }
}

export function delegate<T extends Effect = Effect>(effect: T): NextOperation<T> {
  return { kind, effect, terminal: true }
}

export const isNext = isOfKind<WrapperOperation>(kind)

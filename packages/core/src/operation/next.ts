import { CORE_NAMESPACE } from '../core-namespace'
import { type Effect } from '../effect'
import { type WrapperOperation } from './wrapper'

const kind = `${CORE_NAMESPACE}/next`

export interface NextOperation<T extends Effect = Effect> extends WrapperOperation<T> {
  terminal?: true
}

export function next<T extends Effect = Effect>(effect: T): NextOperation<T> {
  return { kind, effect }
}

export function delegate<T extends Effect = Effect>(effect: T): NextOperation<T> {
  return { kind, effect, terminal: true }
}

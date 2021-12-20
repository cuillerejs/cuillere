import { coreNamespace } from './core-namespace'
import { type Effect } from '../effect'
import { type WrapperOperation } from './wrapper'

const kind = `${coreNamespace}/start`

export function start<T extends Effect>(effect: T): WrapperOperation<T> {
  return { kind, effect }
}

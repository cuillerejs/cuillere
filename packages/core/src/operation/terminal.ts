import { coreNamespace } from './core-namespace'
import { Effect } from '../effect'
import { WrapperOperation } from './wrapper'

const kind = `${coreNamespace}/terminal`

export function terminal<T extends Effect>(effect: T): WrapperOperation<T> {
  return { kind, effect }
}

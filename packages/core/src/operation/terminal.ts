import { Effect } from '../effect'
import { coreNamespace, isOfKind } from './operation'
import { WrapperOperation } from './wrapper'

const kind = `${coreNamespace}/terminal`

export function terminal<T extends Effect>(effect: T): WrapperOperation<T> {
  return { kind, effect }
}

export const isTerminal = isOfKind<WrapperOperation>(kind)

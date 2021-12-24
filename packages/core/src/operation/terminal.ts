import { CORE_NAMESPACE } from '../core-namespace'
import { Effect } from '../effect'
import { WrapperOperation } from './wrapper'

export function terminal<T extends Effect>(effect: T): WrapperOperation<T> {
  return { kind: `${CORE_NAMESPACE}/terminal`, effect }
}

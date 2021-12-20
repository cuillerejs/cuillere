import { Effect } from '../effect'
import { Wrapper, coreNamespace } from './operation'

const kind = `${coreNamespace}/start`

export function start(effect: Effect): Wrapper {
  return { kind, effect }
}

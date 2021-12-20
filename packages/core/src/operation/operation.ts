import type { Effect } from '../effect'

export interface Operation {
  readonly kind: string
}

export function isOperation(value: any): value is Operation {
  return 'kind' in value
}

export function isOfKind<T extends Operation>(kind: string) {
  return function (effect: Effect): effect is T {
    return isOperation(effect) && effect.kind === kind
  }
}

export const coreNamespace = '@cuillere/core'

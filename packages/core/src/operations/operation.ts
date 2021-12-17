import { Generator, isGenerator } from '../generator'

export interface Operation {
  readonly kind: string
}

export type Effect = Operation | Generator

export function isEffect(value: any): value is Effect {
  return isOperation(value) || isGenerator(value)
}

export function isOperation(value: any): value is Operation {
  return 'kind' in value
}

export function isOfKind<T extends Operation>(kind: string) {
  return function (effect: Effect): effect is T {
    return isOperation(effect) && effect.kind === kind
  }
}

export interface Wrapper<T extends Effect = Effect> extends Operation {
  readonly effect: T
}

export function isWrapper(operation: Operation): operation is Wrapper {
  return 'effect' in operation
}

export const coreNamespace = '@cuillere/core'

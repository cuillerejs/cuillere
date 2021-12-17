import { GeneratorFunction } from '../generator'
import { call } from './call'
import { Effect, Wrapper, isOfKind, isEffect, coreNamespace } from './operation'

const kind = `${coreNamespace}/fork`

export function fork<Args extends any[], R>(func: GeneratorFunction<Args, R>, ...args: Args): Wrapper<Effect>
export function fork(effect: Effect): Wrapper<Effect>

export function fork<Args extends any[], R>(arg0: Effect | GeneratorFunction<Args, R>, ...args: Args) {
  return { kind, effect: isEffect(arg0) ? arg0 : call(arg0, ...args) }
}

export const isFork = isOfKind<Wrapper>(kind)

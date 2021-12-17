import { GeneratorFunction } from '../generator'
import { Effect, Wrapper, isOfKind, isEffect, coreNamespace } from './operation'
import { call } from './call'

const kind = `${coreNamespace}/defer`

export function defer<Args extends any[], R>(func: GeneratorFunction<Args, R>, ...args: Args): Wrapper<Effect>
export function defer(effect: Effect): Wrapper<Effect>

export function defer<Args extends any[], R>(arg0: Effect | GeneratorFunction<Args, R>, ...args: Args) {
  return { kind, effect: isEffect(arg0) ? arg0 : call(arg0, ...args) }
}

export const isDefer = isOfKind<Wrapper>(kind)

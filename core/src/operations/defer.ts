import { GeneratorFunction } from '../generator'
import { Wrapper, makeWrapper } from './wrapper'
import { call } from './call'

const DEFER = Symbol('DEFER')

export type Defer = Wrapper<typeof DEFER>

export const [deferOperation, isDefer] = makeWrapper<typeof DEFER, Defer, []>(DEFER)

export function defer(func: GeneratorFunction, ...args: any[]) {
  return deferOperation(call(func, ...args))
}

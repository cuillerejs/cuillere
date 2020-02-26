import { GeneratorFunction } from '../generator'
import { WrapperOperation, makeWrapperOperation } from './operation'
import { call } from './call'

const DEFER = Symbol('DEFER')

export type Defer = WrapperOperation<typeof DEFER>

export const [deferOperation, isDefer] = makeWrapperOperation<typeof DEFER, Defer, []>(DEFER)

export function defer(func: GeneratorFunction, ...args: any[]) {
  return deferOperation(call(func, ...args))
}

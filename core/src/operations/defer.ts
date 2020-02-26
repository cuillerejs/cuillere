import { GeneratorFunction } from '../generator'
import { makeWrapperOperation } from './operation'
import { call } from './call'

export const [deferOperation, isDefer] = makeWrapperOperation(Symbol('DEFER'))

export function defer(func: GeneratorFunction, ...args: any[]) {
  return deferOperation(call(func, ...args))
}

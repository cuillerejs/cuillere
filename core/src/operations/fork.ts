import { GeneratorFunction } from '../generator'
import { makeWrapperOperation } from './operation'
import { call } from './call'

export const [forkOperation, isFork] = makeWrapperOperation(Symbol('FORK'))

export function fork(func: GeneratorFunction, ...args: any[]) {
  return forkOperation(call(func, ...args))
}

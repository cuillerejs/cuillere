import { GeneratorFunction } from '../generator'
import { WrapperOperation, makeWrapperOperation } from './operation'
import { call } from './call'

const FORK = Symbol('FORK')

export type Fork = WrapperOperation<typeof FORK>

export const [forkOperation, isFork] = makeWrapperOperation<typeof FORK, Fork, []>(FORK)

export function fork(func: GeneratorFunction, ...args: any[]): Fork {
  return forkOperation(call(func, ...args))
}

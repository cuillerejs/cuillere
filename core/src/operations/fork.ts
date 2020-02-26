import { Wrapper, makeWrapper } from './wrapper'
import { call } from './call'

const FORK = Symbol('FORK')

export type Fork = Wrapper<typeof FORK>

export const [forkOperation, isFork] = makeWrapper<typeof FORK, Fork, []>(FORK)

export function fork(func: GeneratorFunction, ...args: any[]): Fork {
  return forkOperation(call(func, ...args))
}

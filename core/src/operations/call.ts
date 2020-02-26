import { GeneratorFunction } from '../generator'
import { makeOperation, Operation } from './operation'
import type { BatchedGeneratorFunction } from '../middlewares'

export interface Call extends Operation {
  func: CallFunction
  args?: any[]
  location: string
}

export type CallFunction<Args extends any[] = any[], R = any> =
  GeneratorFunction<Args, R> |
  BatchedGeneratorFunction<Args, R>

export const [callOperation, isCall] = makeOperation(
  Symbol('CALL'),
  (operation, func: GeneratorFunction, ...args: any[]): Call => ({
    ...operation, func, args, location: getLocation(),
  }),
)

function getLocation(): string {
  return Error().stack.split('\n')[3].trim().slice(3)
}

export function call<Args extends any[], R>(func: CallFunction<Args, R>, ...args: Args): Call {
  return callOperation(func, ...args)
}

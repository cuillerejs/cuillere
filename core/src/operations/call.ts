import { GeneratorFunction } from '../generator'
import { Operation } from './operation'
import type { BatchedGeneratorFunction } from '../middlewares'

export interface Call extends Operation {
  func: CallFunction
  args?: any[]
}

export type CallFunction<Args extends any[] = any[], R = any> =
  GeneratorFunction<Args, R> |
  BatchedGeneratorFunction<Args, R>

export function call<Args extends any[], R>(func: CallFunction<Args, R>, ...args: Args): Call {
  return {
    kind: 'call',
    func,
    args,
  }
}

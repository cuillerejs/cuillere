import { type Generator, isGenerator } from './generator'
import { type Operation, isOperation } from './operation'

export type Effect = Operation | Generator

export function isEffect(value: any): value is Effect {
  return isOperation(value) || isGenerator(value)
}

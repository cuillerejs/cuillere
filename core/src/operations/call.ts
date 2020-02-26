import { GeneratorFunction } from '../generator'

const CALL = Symbol('CALL')

export interface Call {
  [CALL]: true
  func: GeneratorFunction
  args?: any[]
  location: string
}

export function call(func: GeneratorFunction, ...args: any[]): Call {
  return { [CALL]: true, func, args, location: getLocation() }
}

export function isCall(operation: any): operation is Call {
  return Boolean(operation?.[CALL])
}

function getLocation(): string {
  return Error().stack.split('\n')[3].trim().slice(3)
}


import { GeneratorFunction } from '../generator'
import { makeOperation, Operation } from './operation'

export interface Call extends Operation {
  func: GeneratorFunction
  args?: any[]
  location: string
}

export const [call, isCall] = makeOperation(
  Symbol('CALL'),
  (operation, func: GeneratorFunction, ...args: any[]): Call => ({
    ...operation, func, args, location: getLocation(),
  }),
)

function getLocation(): string {
  return Error().stack.split('\n')[3].trim().slice(3)
}

import { OperationObject, Operation } from '../operations'
import { GeneratorFunction } from '../generator'

export type HandleFunction<Context = any> = GeneratorFunction<[OperationObject, Context], any, Operation>

export interface Plugin<Context = any> {
  handlers: Record<string, HandleFunction<Context>>
  namespace?: string
  validators?: Record<string, Validator>
}

export type Validator = (operation: OperationObject) => void

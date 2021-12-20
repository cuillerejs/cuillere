import { Effect } from '../effect'
import { Operation } from '../operation'
import { GeneratorFunction } from '../generator'

export type HandleFunction<Context = any> = GeneratorFunction<[Operation, Context], any, Effect>

export interface Plugin<Context = any> {
  handlers: Record<string, HandleFunction<Context>>
  namespace?: string
  validators?: Record<string, Validator>
}

export type Validator = (operation: Operation) => void

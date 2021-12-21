import { Effect } from '../effect'
import { Operation } from '../operation'
import { GeneratorFunction } from '../generator'

export interface Plugin<Context = any> {
  namespace?: string
  handlers: Record<string, HandleFunction<Context>>
  validators?: Record<string, ValidatorFunction>
}

export type HandleFunction<Context = any> = GeneratorFunction<[Operation, Context], any, Effect>

export type ValidatorFunction = (operation: Operation) => void

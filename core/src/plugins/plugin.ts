import { OperationObject, Operation } from '../operations'
import { GeneratorFunction } from '../generator'

export type HandleFunction<Context = any> = GeneratorFunction<[OperationObject, Context], any, Operation>

export interface HandlerDescriptor<Context = any> {
  filter?: (operation: OperationObject, ctx: Context) => boolean
  handle: HandleFunction<Context>
  namespace?: string
}

export type Handler<Context = any> = HandleFunction<Context> | HandlerDescriptor<Context>

export interface Plugin<Context = any> {
  handlers: Record<string, Handler<Context>>
  namespace: string
}

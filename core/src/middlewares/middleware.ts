import { OperationObject, Operation } from '../operations'
import { GeneratorFunction } from '../generator'

export type Handle<Context = any> = GeneratorFunction<[OperationObject, Context], any, Operation>

export interface FilteredHandler<Context = any> {
  filter?: (operation: OperationObject, ctx: Context) => boolean
  handle: Handle<Context>
}

export type Handler<Context = any> = Handle<Context> | FilteredHandler<Context>

export type Middleware<Context = any> = Record<string, Handler<Context> | Handler<Context>[]>

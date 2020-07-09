import { OperationObject, Operation } from '../operations'
import { GeneratorFunction } from '../generator'

export type Handle<C = any> = GeneratorFunction<[OperationObject, C], any, Operation>

export interface FilteredHandler<C = any> {
  filter?: (operation: OperationObject, ctx: C) => boolean
  handle: Handle<C>
}

export type Handler<C = any> = Handle<C> | FilteredHandler<C>

export type Middleware<C = any> = Record<string, Handler<C> | Handler<C>[]>

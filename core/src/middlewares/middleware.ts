import { OperationObject, Operation } from '../operations'
import { GeneratorFunction } from '../generator'

export type Handle = GeneratorFunction<[OperationObject, any], any, Operation>

export interface FilteredHandler {
  filter?: (operation: OperationObject, ctx: any) => boolean
  handle: Handle
}

export type Handler = Handle | FilteredHandler

export type Middleware = Record<string, Handler | Handler[]>

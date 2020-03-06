import { Operation } from '../operations'
import { GeneratorFunction } from '../generator'

export type Handle = GeneratorFunction<[Operation, any]>

export interface FilteredHandler {
  filter?: (operation: Operation, ctx: any) => boolean
  handle: Handle
}

export type Handler = Handle | FilteredHandler

export type Middleware = Record<string, Handler | Handler[]>

import type { QueryOptions } from './query-options'

const QUERY_HANDLER = Symbol('QUERY_HANDLER')

export function getQueryHandler(ctx: any): QueryHandler {
  return ctx[QUERY_HANDLER]
}

export function setQueryHandler(ctx: any, queryHandler: QueryHandler) {
  ctx[QUERY_HANDLER] = queryHandler
}

export interface QueryHandler {
  (query: QueryOptions): Promise<any>
}

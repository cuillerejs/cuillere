import type { QueryResult } from 'pg'
import type { QueryConfig } from './query-config'

const QUERY_HANDLER = Symbol('QUERY_HANDLER')

export function getQueryHandler(ctx: any): QueryHandler {
  return ctx[QUERY_HANDLER]
}

export function setQueryHandler(ctx: any, queryHandler: QueryHandler) {
  ctx[QUERY_HANDLER] = queryHandler
}

export interface QueryHandler<T = any> {
  (query: QueryConfig): Promise<QueryResult<T>>
}

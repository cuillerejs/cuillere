import { Middleware, OperationObject } from '@cuillere/core'
import { QueryResult } from 'pg'
import { QueryConfig } from '../client-manager'

export function queryMiddleware(): Middleware {
  return {
    async* query(operation: Query, ctx: Context) {
      const queryHandler = ctx[QUERY_HANDLER]
      if (!queryHandler) throw new Error('no query handler in context. You probably forgotten to setup a client manager')
      return queryHandler(operation.config)
    },
  }
}

export function setQueryHandler(ctx: any, queryHandler: QueryHandler) {
  ctx[QUERY_HANDLER] = queryHandler
}

const QUERY_HANDLER = Symbol('QUERY_HANDLER')

interface Query extends OperationObject {
  kind: 'query'
  config: QueryConfig
}

export function query(config: QueryConfig): Query {
  return { kind: 'query', config }
}

export interface QueryHandler {
  <T>(query: QueryConfig): Promise<QueryResult<T>>
}

interface Context {
  [QUERY_HANDLER]: QueryHandler
}

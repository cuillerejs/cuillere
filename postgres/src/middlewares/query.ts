import { Middleware, delegate, isStart } from '@cuillere/core'
import { QueryResult } from 'pg'
import { QueryConfig } from '../client-manager'

export function queryMiddleware(): Middleware {
  return async function* queryMiddleware(operation, ctx: Context) {
    if (!isQuery(operation)) return yield delegate(operation)

    const queryHandler = ctx[QUERY_HANDLER]
    if (!queryHandler) throw new Error('no query handler in context. You probably forgotten to setup a client manager')

    return queryHandler(operation.config)
  }
}

export function setQueryHandler(ctx: any, queryHandler: QueryHandler) {
  ctx[QUERY_HANDLER] = queryHandler
}

const QUERY = Symbol('QUERY')
const QUERY_HANDLER = Symbol('QUERY_FN')

interface Query {
  [QUERY]: true
  config: QueryConfig
}

export function query(config: QueryConfig): Query {
  return { [QUERY]: true, config }
}

function isQuery(operation: any): operation is Query {
  return operation?.[QUERY]
}

export interface QueryHandler {
  <T>(query: QueryConfig): Promise<QueryResult<T>>
}

interface Context {
  [QUERY_HANDLER]: QueryHandler
}

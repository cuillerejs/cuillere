import { Plugin, OperationObject } from '@cuillere/core'
import { QueryResult } from 'pg'
import { QueryConfig } from '../client-manager'

const namespace = '@cuillere/postgres/query'

export function queryPlugin(): Plugin {
  return {
    namespace,

    handlers: {
      async* query(operation: Query, ctx: Context) {
        const queryHandler = ctx[QUERY_HANDLER]
        if (!queryHandler) throw new Error('No query handler in context, you probably forgot to setup a client manager')
        return queryHandler(operation.config)
      },
    },
  }
}

export function setQueryHandler(ctx: any, queryHandler: QueryHandler) {
  ctx[QUERY_HANDLER] = queryHandler
}

const QUERY_HANDLER = Symbol('QUERY_HANDLER')

interface Query extends OperationObject {
  config: QueryConfig
}

export function query(config: QueryConfig): Query {
  return { kind: `${namespace}/query`, config }
}

export interface QueryHandler {
  <T = any>(query: QueryConfig): Promise<QueryResult<T>>
}

interface Context {
  [QUERY_HANDLER]: QueryHandler
}

import type { Plugin, Operation } from '@cuillere/core'

import { getQueryHandler } from '../query-handler'
import type { QueryOptions } from '../query-options'
import { getConnectionGetter } from '../connection-getter'

const namespace = '@cuillere/mariadb'

export type MariaOperations = {
  getConnection: GetConnection
  query: Query
}

export function connectionPlugin(): Plugin<MariaOperations> {
  return {
    namespace,

    handlers: {
      async* getConnection({ name }, ctx) {
        const getConnection = getConnectionGetter(ctx)
        if (!getConnection) throw new Error('No client getter in context, you probably forgot to setup a client manager')
        return getConnection(name)
      },

      async* query({ options }, ctx) {
        const queryHandler = getQueryHandler(ctx)
        if (!queryHandler) throw new Error('No query handler in context, you probably forgot to setup a client manager')
        return queryHandler(options)
      },
    },
  }
}

export interface GetConnection extends Operation {
  name?: string
}

export function getConnection(name?: string): GetConnection {
  return { kind: `${namespace}/getConnection`, name }
}

export interface Query extends Operation {
  options: QueryOptions
}

export function query(options: QueryOptions): Query {
  return { kind: `${namespace}/query`, options }
}

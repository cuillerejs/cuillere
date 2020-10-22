import type { Plugin, OperationObject } from '@cuillere/core'

import { getQueryHandler } from '../query-handler'
import type { QueryOptions } from '../query-options'
import { getConnectionGetter } from '../connection-getter'

const namespace = '@cuillere/mariadb'

export function clientPlugin(): Plugin {
  return {
    namespace,

    handlers: {
      async* getConnection({ name }: GetConnection, ctx) {
        const getConnection = getConnectionGetter(ctx)
        if (!getConnection) throw new Error('No client getter in context, you probably forgot to setup a client manager')
        return getConnection(name)
      },

      async* query({ options }: Query, ctx) {
        const queryHandler = getQueryHandler(ctx)
        if (!queryHandler) throw new Error('No query handler in context, you probably forgot to setup a client manager')
        return queryHandler(options)
      },
    },
  }
}

export interface GetConnection extends OperationObject {
  name?: string
}

export function getConnection(name?: string): GetConnection {
  return { kind: `${namespace}/getConnection`, name }
}

export interface Query extends OperationObject {
  options: QueryOptions
}

export function query(options: QueryOptions): Query {
  return { kind: `${namespace}/query`, options }
}

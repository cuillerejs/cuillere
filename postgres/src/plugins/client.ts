import { Plugin, OperationObject, next } from '@cuillere/core'
import type { Describe } from '@cuillere/crud'

import { getQueryHandler } from '../query-handler'
import type { QueryConfig } from '../query-config'
import { getClientGetter } from '../client-getter'
import { getPoolsGetter } from '../pools-getter'

const namespace = '@cuillere/postgres'

export function clientPlugin(): Plugin {
  return {
    namespace,

    handlers: {
      async* getClient({ name }: GetClient, ctx) {
        const getClient = getClientGetter(ctx)
        if (!getClient) throw new Error('No client getter in context, you probably forgot to setup a client manager')
        return getClient(name)
      },

      async* query({ config }: Query, ctx) {
        const queryHandler = getQueryHandler(ctx)
        if (!queryHandler) throw new Error('No query handler in context, you probably forgot to setup a client manager')
        return queryHandler(config)
      },

      * '@cuillere/crud/describe'(describe: Describe, ctx) {
        const getPools = getPoolsGetter(ctx)
        if (!getClient) throw new Error('No pools getter in context, you probably forgot to setup a client manager')

        for (const pool of getPools()) {
          const { rows: tables } = yield query({
            text: `
              SELECT table_schema AS schema, table_name AS table
              FROM information_schema.tables
              WHERE table_schema NOT LIKE 'pg_%'
              AND table_schema <> 'information_schema'
            `,
            pool,
          })
        }

        yield next(describe)
      },
    },
  }
}

export interface GetClient extends OperationObject {
  name?: string
}

export function getClient(name?: string): GetClient {
  return { kind: `${namespace}/getClient`, name }
}

export interface Query extends OperationObject {
  config: QueryConfig
}

export function query(config: QueryConfig): Query {
  return { kind: `${namespace}/query`, config }
}

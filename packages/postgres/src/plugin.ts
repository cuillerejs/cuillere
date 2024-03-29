import { Plugin, Operation } from '@cuillere/core'

import { getQueryHandler } from './query-handler'
import type { QueryConfig } from './query-config'
import { getClientGetter } from './client-getter'
import { getPoolsGetter } from './pools-getter'

const namespace = '@cuillere/postgres'

export type PostgresOperations = {
  getClient: GetClient
  query: Query
  getPools: Operation
}

export function postgresPlugin(): Plugin<PostgresOperations> {
  return {
    namespace,

    handlers: {
      async* getClient({ name }, ctx) {
        const getClient = getClientGetter(ctx)
        if (!getClient) throw new Error('No client getter in context, you probably forgot to setup a client manager')
        return getClient(name)
      },

      async* query({ config }, ctx) {
        const queryHandler = getQueryHandler(ctx)
        if (!queryHandler) throw new Error('No query handler in context, you probably forgot to setup a client manager')
        return queryHandler(config)
      },

      async* getPools(_, ctx) {
        const getPools = getPoolsGetter(ctx)
        if (!getPools) throw new Error('No pools getter in context, you probably forgot to setup a client manager')
        return getPools()
      },
    },
  }
}

export interface GetClient extends Operation {
  name?: string
}

export function getClient(name?: string): GetClient {
  return { kind: `${namespace}/getClient`, name }
}

export interface Query extends Operation {
  config: QueryConfig
}

export function query(config: QueryConfig): Query {
  return { kind: `${namespace}/query`, config }
}

export function getPools(): Operation {
  return { kind: `${namespace}/getPools` }
}

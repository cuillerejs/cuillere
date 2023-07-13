import { Plugin, Operation } from '@cuillere/core'

import { AsyncTaskManager, TransactionManagerType } from '@cuillere/server-plugin'
import { Client } from 'pg'
import type { QueryConfig } from './query-config'
import { PoolConfig, PoolManager } from './pool-manager'
import { ClientManager, getClientManager } from './client-manager'

const namespace = '@cuillere/postgres'

export type PostgresOperations = {
  getClient: GetClient
  query: Query
  getPools: Operation
}

export type PostgresPluginOptions = {
  pool?: PoolManager | PoolConfig | PoolConfig[]
  transactionManager?: TransactionManagerType
}

export function postgresPlugin({ pool, transactionManager }: PostgresPluginOptions): Plugin<PostgresOperations> {
  const poolManager = pool instanceof PoolManager ? pool : new PoolManager(pool)

  return {
    namespace,

    async wrap(next, ctx: PostgresContext) {
      // If a client manager is present, the transaction is handled somewhere else
      if (ctx._clientManager) {
        return next()
      }

      if (!poolManager) {
        throw new Error('No pool manager found. Give one to the plugin or initialize it in context')
      }
      ctx._clientManager = getClientManager({ poolManager, transactionManager })

      return new AsyncTaskManager(ctx._clientManager).execute(next, {})
    },

    handlers: {
      async getClient({ name }, ctx: PostgresContext) {
        return ctx._clientManager.getClient(name)
      },

      async query({ config }, ctx) {
        return ctx._clientManager.query(config)
      },

      async getPools(_, ctx) {
        return ctx._clientManager.getPools()
      },
    },
  }
}

export interface GetClient extends Operation {
  name?: string
}

export function* getClient(name?: string): Generator<GetClient, Client> {
  return (yield { kind: `${namespace}/getClient`, name }) as Client
}

export interface Query extends Operation {
  config: QueryConfig
}

export function* query<T = any>(config: QueryConfig): Generator<Query, T> {
  return (yield { kind: `${namespace}/query`, config }) as T
}

export function* getPools(): Generator<Operation, string[]> {
  return (yield { kind: `${namespace}/getPools` }) as string[]
}

export interface PostgresContext {
  _clientManager?: ClientManager
  [key: string]: any
}

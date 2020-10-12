import type { PoolClient } from 'pg'
import type { TaskListener } from '@cuillere/core'

import { PoolProvider, DEFAULT_POOL, PoolConfig } from './pool-provider'
import { setQueryHandler } from './query-handler'
import type { QueryConfig } from './query-config'
import { setClientGetter } from './client-getter'
import { TransactionManager, getTransactionManager } from './transaction-manager'

export function getClientManager(options: ClientManagerOptions): ClientManager {
  const poolProvider = options.poolProvider ?? new PoolProvider(options.poolConfig)
  if (!poolProvider) throw TypeError('Client manager needs one of poolConfig or poolProvider')
  return new ClientManagerImpl(poolProvider, getTransactionManager(options.transactionManager))
}

export interface ClientManagerOptions {
  poolConfig?: PoolConfig | PoolConfig[]
  poolProvider?: PoolProvider
  transactionManager?: 'none' | 'default' | 'two-phase' | 'read-only' // FIXME mutualize type with getTransactionManager
}

export interface ClientManager extends TaskListener {
  end(): Promise<void>
}

class ClientManagerImpl implements ClientManager {
  #poolProvider: PoolProvider

  #transactionManager: TransactionManager

  #clients: Record<string, Promise<PoolClient>>

  constructor(poolProvider: PoolProvider, transactionManager: TransactionManager) {
    this.#poolProvider = poolProvider
    this.#transactionManager = transactionManager
    this.#clients = {}
  }

  initialize(ctx: any) {
    setClientGetter(ctx, name => this.getClient(name))
    setQueryHandler(ctx, query => this.query(query))
  }

  private async query(query: QueryConfig) {
    if (query.usePoolQuery) return this.#poolProvider.query(query)
    return (await this.getClient(query.pool)).query(query)
  }

  private getClient(name = DEFAULT_POOL) {
    if (!(name in this.#clients)) {
      this.#clients[name] = this.#poolProvider.connect(name)
      if (this.#transactionManager) this.#clients[name] = this.#transactionManager.connect(this.#clients[name])
    }
    return this.#clients[name]
  }

  async preComplete(result: any) {
    await this.#transactionManager?.preComplete?.(await this.clients, result)
  }

  async complete(result: any) {
    await this.#transactionManager?.complete(await this.clients, result)
  }

  async error(error: any) {
    await this.#transactionManager?.error(await this.clients, error)
  }

  async finalize(err?: any) {
    for (const client of await this.clients) client.release(err)
    this.#clients = {}
  }

  private get clients() {
    return Promise.all(Object.values(this.#clients))
  }

  public end() {
    return this.#poolProvider.end()
  }
}

import type { PoolClient } from 'pg'
import type { TaskListener } from '@cuillere/server'

import { PoolManager, DEFAULT_POOL, PoolConfig } from './pool-manager'
import { setQueryHandler } from './query-handler'
import type { QueryConfig } from './query-config'
import { setClientGetter } from './client-getter'
import { TransactionManager, getTransactionManager } from './transaction-manager'

export function getClientManager(options: ClientManagerOptions): ClientManager {
  const poolManager = options.poolManager ?? new PoolManager(options.poolConfig)
  if (!poolManager) throw TypeError('Client manager needs one of poolConfig or poolManager')
  return new ClientManagerImpl(poolManager, getTransactionManager(options.transactionManager))
}

export interface ClientManagerOptions {
  poolConfig?: PoolConfig | PoolConfig[]
  poolManager?: PoolManager
  transactionManager?: 'none' | 'default' | 'two-phase' | 'read-only' // FIXME mutualize type with getTransactionManager
}

export interface ClientManager extends TaskListener {
  end(): Promise<void>
}

class ClientManagerImpl implements ClientManager {
  #poolManager: PoolManager

  #transactionManager: TransactionManager

  #clients: Record<string, Promise<PoolClient>>

  constructor(poolManager: PoolManager, transactionManager: TransactionManager) {
    this.#poolManager = poolManager
    this.#transactionManager = transactionManager
    this.#clients = {}
  }

  initialize(ctx: any) {
    setClientGetter(ctx, name => this.getClient(name))
    setQueryHandler(ctx, query => this.query(query))
  }

  private async query(query: QueryConfig) {
    if (query.usePoolQuery) return this.#poolManager.query(query)
    return (await this.getClient(query.pool)).query(query)
  }

  private getClient(name = DEFAULT_POOL) {
    if (!(name in this.#clients)) {
      this.#clients[name] = this.#poolManager.connect(name)
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
    return this.#poolManager.end()
  }
}

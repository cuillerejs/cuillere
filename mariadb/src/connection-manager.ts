import type { PoolConnection } from 'mariadb'
import type { TaskListener, TransactionManagerType } from '@cuillere/server'

import { PoolManager, DEFAULT_POOL, PoolConfig } from './pool-manager'
import { setQueryHandler } from './query-handler'
import type { QueryOptions } from './query-options'
import { setConnectionGetter } from './connection-getter'
import { TransactionManager, getTransactionManager } from './transaction-manager'

export function getConnectionManager(options: ConnectionManagerOptions): ConnectionManager {
  const poolManager = options.poolManager ?? new PoolManager(options.poolConfig)
  if (!poolManager) throw TypeError('Connection manager needs one of poolConfig or poolManager')

  let transactionManagerType = options.transactionManager
  if (transactionManagerType === 'auto') transactionManagerType = Object.keys(poolManager.pools).length === 1 ? 'default' : 'two-phase'

  return new ConnectionManagerImpl(poolManager, getTransactionManager(transactionManagerType))
}

export interface ConnectionManagerOptions {
  poolConfig?: PoolConfig | PoolConfig[]
  poolManager?: PoolManager
  transactionManager?: TransactionManagerType
}

export interface ConnectionManager extends TaskListener {
  end(): Promise<void>
}

class ConnectionManagerImpl implements ConnectionManager {
  #poolManager: PoolManager

  #transactionManager: TransactionManager

  #connections: Record<string, Promise<PoolConnection>>

  constructor(poolManager: PoolManager, transactionManager: TransactionManager) {
    this.#poolManager = poolManager
    this.#transactionManager = transactionManager
    this.#connections = {}
  }

  initialize(ctx: any) {
    setConnectionGetter(ctx, name => this.getConnection(name))
    setQueryHandler(ctx, query => this.query(query))
  }

  private async query(query: QueryOptions) {
    if (query.usePoolQuery) return this.#poolManager.query(query)
    return (await this.getConnection(query.pool)).query(query)
  }

  private getConnection(name = DEFAULT_POOL) {
    if (!(name in this.#connections)) {
      this.#connections[name] = this.#poolManager.connect(name)
      if (this.#transactionManager) this.#connections[name] = this.#transactionManager.connect(this.#connections[name])
    }
    return this.#connections[name]
  }

  async preComplete(result: any) {
    await this.#transactionManager?.preComplete?.(await this.connections, result)
  }

  async complete(result: any) {
    await this.#transactionManager?.complete(await this.connections, result)
  }

  async error(error: any) {
    await this.#transactionManager?.error(await this.connections, error)
  }

  async finalize() {
    for (const connection of await this.connections) connection.release()
    this.#connections = {}
  }

  private get connections() {
    return Promise.all(Object.values(this.#connections))
  }

  public end() {
    return this.#poolManager.end()
  }
}

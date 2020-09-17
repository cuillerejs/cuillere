import type { PoolClient } from 'pg'
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
  transactionManager?: 'none' | 'default' | 'two-phase'
}

export interface ClientManager {
  execute(ctx: any, task: () => Promise<any>): Promise<any>
  executeYield(ctx: any, value: any): AsyncGenerator<any, any, any>
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

  public async execute(ctx: any, task: () => Promise<any>) {
    let err: any
    this.setupContext(ctx)
    try {
      const result = await task()
      await this.onSuccess(result)
      return result
    } catch (e) {
      await this.onError(err = e)
      throw e
    } finally {
      await this.release(err)
    }
  }

  public async* executeYield(ctx: any, task: any) {
    let err: any
    this.setupContext(ctx)
    try {
      const result = yield task
      await this.onSuccess(result)
      return result
    } catch (e) {
      await this.onError(err = e)
      throw e
    } finally {
      await this.release(err)
    }
  }

  private setupContext(ctx: any) {
    setClientGetter(ctx, name => this.getClient(name))
    setQueryHandler(ctx, query => this.query(query))
  }

  private async query(query: QueryConfig) {
    // FIXME change API ?
    if (query.transaction?.manager === 'none') return this.#poolProvider.query(query)
    return (await this.getClient(query.pool)).query(query)
  }

  private getClient(name = DEFAULT_POOL) {
    if (!(name in this.#clients)) {
      this.#clients[name] = this.#poolProvider.connect(name)
      if (this.#transactionManager) this.#clients[name] = this.#transactionManager.onConnect(this.#clients[name])
    }
    return this.#clients[name]
  }

  private async onSuccess(result: any) {
    await this.#transactionManager?.onSuccess(await this.clients, result)
  }

  private async onError(error: any) {
    await this.#transactionManager?.onError(await this.clients, error)
  }

  private async release(err?: any) {
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

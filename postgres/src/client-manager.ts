import type { PoolClient } from 'pg'
import { PoolProvider, DEFAULT_POOL, PoolConfig } from './pool-provider'
import { release } from './transactions'
import { setQueryHandler } from './query-handler'
import type { QueryConfig } from './query-config'
import { setClientGetter } from './client-getter'

export class ClientManager {
  private clients: Record<string, Promise<PoolClient>>

  private provider: PoolProvider

  public constructor(options: ClientManagerOptions) {
    this.provider = options.poolProvider ?? new PoolProvider(options.poolConfig)
    this.clients = {}
  }

  public setupContext(ctx: any) {
    setClientGetter(ctx, name => this.getClient(name))
    setQueryHandler(ctx, query => this.query(query))
  }

  public async query(query: QueryConfig) {
    if (query.transaction?.manager === 'none') return this.provider.query(query)
    return (await this.getClient(query.pool)).query(query)
  }

  public getClient(name = DEFAULT_POOL) {
    if (!this.clients[name]) this.clients[name] = this.createClient(name)
    return this.clients[name]
  }

  protected async createClient(name: string) {
    return this.provider.connect(name)
  }

  protected getClients() {
    return Promise.all(Object.values(this.clients))
  }

  public async release(isError?: boolean) {
    await release(await this.getClients(), isError)
    this.clients = {}
  }

  public async transactional<T>(task: () => Promise<T>): Promise<T> {
    try {
      return await task()
    } finally {
      await this.release()
    }
  }

  public async* transactionalYield(yieldValue: any) {
    try {
      return yield yieldValue
    } finally {
      await this.release()
    }
  }

  public async end() {
    return this.provider.end()
  }
}

export interface ClientManagerOptions {
  poolProvider?: PoolProvider
  poolConfig?: PoolConfig | PoolConfig[]
}

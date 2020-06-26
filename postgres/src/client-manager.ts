import { PoolClient, QueryConfig as PgQueryConfig } from 'pg'
import { PoolProvider, DEFAULT_POOL } from './pool-provider'
import { release } from './transactions'

export class ClientManager {
  private clients: Record<string, Promise<PoolClient>>

  private provider: PoolProvider

  public constructor(provider: PoolProvider) {
    this.provider = provider
    this.clients = {}
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

export interface QueryConfig extends PgQueryConfig {
  pool?: string
  transaction?: {
    manager?: 'none' | 'default'
  }
}

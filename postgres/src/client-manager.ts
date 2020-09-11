import type { PoolClient } from 'pg'
import { PoolProvider, DEFAULT_POOL } from './pool-provider'
import { setQueryHandler } from './query-handler'
import type { QueryConfig } from './query-config'
import { setClientGetter } from './client-getter'
import { TransactionManager } from './transaction-manager'

export class ClientManager {
  private provider: PoolProvider

  private transactionManager: TransactionManager

  private clients: Record<string, Promise<PoolClient>>

  public constructor(provider: PoolProvider, transactionManager: TransactionManager) {
    this.provider = provider
    this.transactionManager = transactionManager
    this.clients = {}
  }

  public async query(query: QueryConfig) {
    // FIXME change API ?
    if (query.transaction?.manager === 'none') return this.provider.query(query)
    return (await this.getClient(query.pool)).query(query)
  }

  public async getClient(name = DEFAULT_POOL) {
    if (!(name in this.clients)) {
      this.clients[name] = this.provider.connect(name)
      await this.transactionManager?.onConnect(await this.clients[name])
    }
    return this.clients[name]
  }

  public async execute(ctx: any, task: () => Promise<any>) {
    let err: Error
    this.setupContext(ctx)
    try {
      await task()
      await this.onSuccess()
    } catch (e) {
      err = e
      await this.onError()
    } finally {
      await this.release(err)
    }
  }

  public async* executeYield(ctx: any, value: any) {
    let err: Error
    this.setupContext(ctx)
    try {
      yield value
      await this.onSuccess()
    } catch (e) {
      err = e
      await this.onError()
    } finally {
      await this.release(err)
    }
  }

  private setupContext(ctx: any) {
    setClientGetter(ctx, name => this.getClient(name))
    setQueryHandler(ctx, query => this.query(query))
  }

  private async onSuccess() {
    await this.transactionManager?.onSuccess(await this.getClients())
  }

  private async onError() {
    await this.transactionManager?.onError(await this.getClients())
  }

  private async release(err?: Error) {
    for (const client of await this.getClients()) client.release(err)
    this.clients = {}
  }

  private getClients() {
    return Promise.all(Object.values(this.clients))
  }

  public end() {
    return this.provider.end()
  }
}

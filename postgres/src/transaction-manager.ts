import { PoolClient } from 'pg'
import { ClientManager } from './client-manager'
import { rollback, commit, UNSAFE_commit } from './transactions'
import { PoolProvider } from './pool-provider'

export interface TransactionManagerOptions {
  prepared?: boolean
}

export class TransactionManager extends ClientManager {
  #doCommit: typeof commit

  constructor(provider: PoolProvider, options: TransactionManagerOptions = {}) {
    super(provider)
    this.#doCommit = (options.prepared ?? true) ? commit : UNSAFE_commit
  }

  protected async createClient(name: string): Promise<PoolClient> {
    const client = await super.createClient(name)
    await client.query('BEGIN')
    return client
  }

  public async transactional<T>(task: () => Promise<T>): Promise<T> {
    try {
      const result = await task()
      await this.commit()
      return result
    } catch (err) {
      await this.rollback()
      throw err
    }
  }

  public async* transactionalYield(yieldValue: any) {
    try {
      const result = yield yieldValue
      await this.commit()
      return result
    } catch (err) {
      await this.rollback()
      throw err
    }
  }

  async commit() {
    try {
      await this.#doCommit(await this.getClients())
    } finally {
      await this.release()
    }
  }

  async rollback() {
    try {
      await rollback(await this.getClients())
    } finally {
      await this.release(true)
    }
  }
}

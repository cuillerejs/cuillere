import type { PoolClient } from 'pg'
import { ClientManager, ClientManagerOptions } from './client-manager'
import { rollback, commit, unsafeCommit } from './transactions'

export interface TransactionManagerOptions extends ClientManagerOptions {
  // FIXME prepared makes think of prepared statements, maybe another name ? twoPhase ?
  prepared?: boolean
}

export class TransactionManager extends ClientManager {
  #doCommit: typeof commit

  constructor(options: TransactionManagerOptions) {
    super(options)
    this.#doCommit = (options.prepared ?? true) ? commit : unsafeCommit
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

  public async* transactionalYield(value: any) {
    try {
      const result = yield value
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

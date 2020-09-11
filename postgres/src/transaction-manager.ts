import type { PoolClient } from 'pg'

export interface TransactionManager {
  onConnect(client: PoolClient): Promise<void>
  onSuccess(clients: PoolClient[]): Promise<void>
  onError(clients: PoolClient[]): Promise<void>
}

export class DefaultTransactionManager implements TransactionManager {
  async onConnect(client: PoolClient): Promise<void> { // eslint-disable-line class-methods-use-this
    await client.query('BEGIN')
  }

  async onSuccess(clients: PoolClient[]): Promise<void> { // eslint-disable-line class-methods-use-this
    for (const client of clients) await client.query('COMMIT')
  }

  async onError(clients: PoolClient[]): Promise<void> { // eslint-disable-line class-methods-use-this
    await Promise.allSettled(clients.map(client => client.query('ROLLBACK')))
  }
}

export class TwoPhaseTransactionManager implements TransactionManager {
  private transactionsIds = new Map<PoolClient, string>()

  async onConnect(client: PoolClient): Promise<void> { // eslint-disable-line class-methods-use-this
    await client.query('BEGIN')
  }

  async onSuccess(clients: PoolClient[]): Promise<void> {
    // FIXME
  }

  async onError(clients: PoolClient[]): Promise<void> {
    // FIXME
  }
}

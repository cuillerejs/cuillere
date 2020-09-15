import type { PoolClient } from 'pg'
import uuid from './utils/uuid'

export interface TransactionManager {
  onConnect(clientPromise: Promise<PoolClient>): Promise<PoolClient>
  onSuccess(clients: PoolClient[], result: any): Promise<void>
  onError(clients: PoolClient[], error: any): Promise<void>
}

export function getTransactionManager(type = 'default'): TransactionManager {
  switch (type) {
    case 'none': return null
    case 'default': return new DefaultTransactionManager()
    case 'two-phase': return new TwoPhaseTransactionManager()
    default: throw TypeError(`Unknown transaction manager type "${type}"`)
  }
}

class DefaultTransactionManager implements TransactionManager {
  async onConnect(clientPromise: Promise<PoolClient>): Promise<PoolClient> { // eslint-disable-line class-methods-use-this
    const client = await clientPromise
    await client.query('BEGIN')
    return client
  }

  async onSuccess(clients: PoolClient[]): Promise<void> { // eslint-disable-line class-methods-use-this
    for (const client of clients) await client.query('COMMIT')
  }

  async onError(clients: PoolClient[]): Promise<void> { // eslint-disable-line class-methods-use-this
    await Promise.allSettled(clients.map(client => client.query('ROLLBACK')))
  }
}

class TwoPhaseTransactionManager implements TransactionManager {
  private transactionsIds = new Map<PoolClient, string>()

  async onConnect(clientPromise: Promise<PoolClient>): Promise<PoolClient> { // eslint-disable-line class-methods-use-this
    const client = await clientPromise
    await client.query('BEGIN')
    return client
  }

  async onSuccess(clients: PoolClient[]): Promise<void> {
    // FIXME use Promise.all ?
    for (const client of clients) {
      const id = uuid()
      await client.query(`PREPARE TRANSACTION '${id}'`)
      this.transactionsIds.set(client, id)
    }

    // FIXME use Promise.all ?
    for (const client of clients) {
      if (!this.transactionsIds.has(client)) throw Error('no transaction id found for client')
      await client.query(`COMMIT PREPARED '${this.transactionsIds.get(client)}'`)
      this.transactionsIds.delete(client)
    }
  }

  async onError(clients: PoolClient[]): Promise<void> {
    await Promise.allSettled(clients.map(async (client) => {
      if (this.transactionsIds.has(client)) {
        await client.query(`ROLLBACK PREPARED '${this.transactionsIds.get(client)}'`)
      } else {
        await client.query('ROLLBACK')
      }
    }))
  }
}

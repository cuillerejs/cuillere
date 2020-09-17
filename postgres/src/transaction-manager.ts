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
  #preparedIds = new Map<PoolClient, string>()

  #commiteds = new Set<PoolClient>()

  async onConnect(clientPromise: Promise<PoolClient>): Promise<PoolClient> { // eslint-disable-line class-methods-use-this
    const client = await clientPromise
    await client.query('BEGIN')
    return client
  }

  async onSuccess(clients: PoolClient[]): Promise<void> {
    for (const client of clients) {
      const id = uuid()
      await client.query(`PREPARE TRANSACTION '${id}'`)
      this.#preparedIds.set(client, id)
    }

    const results = await Promise.allSettled(clients.map(async (client) => {
      try {
        await client.query(`COMMIT PREPARED '${this.#preparedIds.get(client)}'`)
        this.#commiteds.add(client)
      } catch (e) {
        console.error(`Commit prepared transaction ${this.#preparedIds.get(client)} failed`, e)
        throw e
      } finally {
        this.#preparedIds.delete(client)
      }
    }))

    if (results.some(result => result.status === 'rejected')) throw Error('One or more prepared transaction commit failed')
  }

  async onError(clients: PoolClient[]): Promise<void> {
    const results = await Promise.allSettled(clients.map(async (client) => {
      if (this.#commiteds.has(client)) return

      if (this.#preparedIds.has(client)) {
        try {
          await client.query(`ROLLBACK PREPARED '${this.#preparedIds.get(client)}'`)
        } catch (e) {
          console.error(`Rollback prepared transaction ${this.#preparedIds.get(client)} failed`, e)
          throw e
        } finally {
          this.#preparedIds.delete(client)
        }
      } else {
        await client.query('ROLLBACK')
      }
    }))

    if (results.some(result => result.status === 'rejected')) throw Error('One or more transaction rollback failed')
  }
}

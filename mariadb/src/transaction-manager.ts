import type { PoolConnection } from 'mariadb'

export interface TransactionManager {
  connect(connectionPromise: Promise<PoolConnection>): Promise<PoolConnection>
  preComplete?(connections: PoolConnection[], result: any): Promise<void>
  complete(connections: PoolConnection[], result: any): Promise<void>
  error(connections: PoolConnection[], error: any): Promise<void>
}

export function getTransactionManager(type = 'default'): TransactionManager {
  switch (type) {
    case 'none': return null
    case 'default': return new DefaultTransactionManager()
    case 'two-phase': return new TwoPhaseTransactionManager()
    case 'read-only': return new ReadOnlyTransactionManager()
    default: throw TypeError(`Unknown transaction manager type "${type}"`)
  }
}

class DefaultTransactionManager implements TransactionManager {
  async connect(connectionPromise: Promise<PoolConnection>): Promise<PoolConnection> { // eslint-disable-line class-methods-use-this
    const connection = await connectionPromise
    await connection.query('BEGIN')
    return connection
  }

  async complete(connections: PoolConnection[]): Promise<void> { // eslint-disable-line class-methods-use-this
    for (const connection of connections) await connection.query('COMMIT')
  }

  async error(connections: PoolConnection[], error: any): Promise<void> { // eslint-disable-line class-methods-use-this
    const results = await Promise.allSettled(connections.map(connection => connection.query('ROLLBACK')))

    if (results.some(result => result.status === 'rejected')) {
      const e = Error('One or more transaction rollback failed')
      e.stack += `\nRollback caused by: ${error.stack}`
      throw e
    }
  }
}

class TwoPhaseTransactionManager implements TransactionManager {
  #preparedIds = new Map<PoolConnection, string>()

  #committed = false

  async connect(connectionPromise: Promise<PoolConnection>): Promise<PoolConnection> { // eslint-disable-line class-methods-use-this
    const connection = await connectionPromise
    const id = await connection.query('SELECT UUID()')
    await connection.query(`XA START '${id}'`)
    this.#preparedIds.set(connection, id)
    return connection
  }

  async preComplete(connections: PoolConnection[]): Promise<void> {
    for (const connection of connections) {
      const id = this.#preparedIds.get(connection)
      await connection.query(`XA END '${id}'`)
      await connection.query(`XA PREPARE '${id}'`)
    }

    this.#committed = true
  }

  async complete(connections: PoolConnection[]): Promise<void> {
    const results = await Promise.allSettled(connections.map(async (connection) => {
      try {
        await connection.query(`XA COMMIT '${this.#preparedIds.get(connection)}'`)
      } catch (e) {
        console.error(`Prepared transaction ${this.#preparedIds.get(connection)} commit failed`, e)
        throw e
      }
    }))

    if (results.some(result => result.status === 'rejected')) throw Error('One or more prepared transaction commit failed')
  }

  async error(connections: PoolConnection[], error: any): Promise<void> {
    if (this.#committed) return

    const results = await Promise.allSettled(connections.map(async (connection) => {
      if (this.#preparedIds.has(connection)) {
        try {
          await connection.query(`XA ROLLBACK '${this.#preparedIds.get(connection)}'`)
        } catch (e) {
          console.error(`Prepared transaction ${this.#preparedIds.get(connection)} rollback failed`, e)
          throw e
        }
      } else {
        await connection.query('ROLLBACK')
      }
    }))

    if (results.some(result => result.status === 'rejected')) {
      const e = Error('One or more transaction rollback failed')
      e.stack += `\nRollback caused by: ${error.stack}`
      throw e
    }
  }
}

class ReadOnlyTransactionManager extends DefaultTransactionManager {
  async connect(connectionPromise: Promise<PoolConnection>): Promise<PoolConnection> { // eslint-disable-line class-methods-use-this
    const connection = await connectionPromise
    await connection.query('START TRANSACTION READ ONLY')
    return connection
  }
}

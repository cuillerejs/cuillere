import { PoolClient } from 'pg'
import { chain, allSettled } from '@cuillere/core/dist/utils/promise'
import uuid from './utils/uuid'

const TRANSACTION_ID = Symbol('TRANSACTION_ID')

interface Client extends PoolClient {
  [TRANSACTION_ID]?: string
}

const error = (message: string) => new Error(`[CUILLERE] ${message}`)

export const rollback = (clients: Client[]) => allSettled(clients.map(async client => {
  try {
    if (!client[TRANSACTION_ID]) await client.query('ROLLBACK')
    else await client.query(`ROLLBACK PREPARED '${client[TRANSACTION_ID]}'`)
  } catch (err) {
    throw error(`error during rollback: ${err.message}`)
  }
}))

const prepare = async (clients: Client[])=> {
  try {
    await chain(clients, async client => {
      const id = uuid()
      await client.query(`PREPARE TRANSACTION '${id}'`)
      client[TRANSACTION_ID] = id
    })
  } catch (err) {
    throw error(`error durring transaction preparation phase: ${err.message}`)
  }
}

const commitPrepared = async (clients: Client[]) => {
  try {
    await chain(clients, async (client, index) => {
      if (!client[TRANSACTION_ID]) throw new Error(`the client ${index} doesn't have a prepared transaction id`)
      await client.query(`COMMIT PREPARED '${client[TRANSACTION_ID]}'`)
      client[TRANSACTION_ID] = undefined
    })
  } catch (err) {
    throw error(`error during commit ${err}`)
  }
}

export const commit = async (clients: Client[]): Promise<void> => {
  if (clients.length === 1) {
    await clients[0].query('COMMIT')
  } else {
    await prepare(clients)
    await commitPrepared(clients)
  }
}

export const UNSAFE_commit = async (clients: Client[]) => {
  try {
    await chain(clients, (client) => client.query(`COMMIT`))
  } catch (err) {
    throw error(`error during unsafe commit ${err}`)
  }
}

export const release = (clients: Client[], err?: Error) => chain(clients, async client => client.release(err))
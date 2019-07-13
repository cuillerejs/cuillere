import { Pool, PoolConfig as PgPoolConfig, PoolClient } from 'pg'
import { commit, rollback, release, UNSAFE_commit } from './transactions'
import { promiseChain } from './utils';

const GET_CLIENT = Symbol('GET_CLIENT')
const CREATE_CLIENT = Symbol('CREATE_CLIENT')
const CLIENTS = Symbol('CLIENTS')
const DEFAULT_POOL = 'DEFAULT POOL'

export interface PoolConfig extends PgPoolConfig {
  name?: string;
}

export interface Context {
  [CLIENTS]?: Record<string, Promise<PoolClient>>
  [GET_CLIENT]?: (name?: string) => Promise<PoolClient>
  [CREATE_CLIENT]?: (name: string) => Promise<PoolClient>
}

export interface Executor {
  <R>(ctx: Context, cb: () => Promise<R>): Promise<R>
}

export interface Provider extends Executor {
  close(): Promise<void>
}

export const getClient = async (ctx: Context, name?: string): Promise<PoolClient> => ctx[GET_CLIENT](name)
const getClients = async (ctx: Context): Promise<PoolClient[]> => Promise.all(Object.values(ctx[CLIENTS]))

const makePools = (poolConfigs: PoolConfig[]): Record<string, Pool> => {
  if (poolConfigs.length <= 1) {
    const [poolConfig] = poolConfigs
    const name = (poolConfig && poolConfig.name) || DEFAULT_POOL
    return { [name]: new Pool(poolConfig) }
  }

  const pools: Record<string, Pool> = {}
  poolConfigs.forEach(({ name, ...poolConfig }) => {
    if (!name) throw new TypeError('Each pool config should have a name')
    pools[name] = new Pool(poolConfig)
  })
  return pools
}

export function createClientPovider(...poolConfigs: PoolConfig[]): Provider {
  const pools = makePools(poolConfigs)

  const provider: Provider = async (ctx, cb) => {
    if (ctx[CLIENTS]) throw new Error("[CUILLERE] this context is already in use. You can't use a transactionExecutor with the same context in parallel.")
    ctx[CLIENTS] = {}

    ctx[CREATE_CLIENT] = (name: string) => pools[name].connect()
    ctx[GET_CLIENT] = async (name?: string) => {
      const clientName = name || DEFAULT_POOL
      if (!ctx[CLIENTS][clientName]) ctx[CLIENTS][clientName] = ctx[CREATE_CLIENT](clientName)
      return ctx[CLIENTS][clientName]
    }

    let error: Error
    try {
      return await cb()
    } catch (err) {
      error = err
    } finally {
      await release(await getClients(ctx), error)
      ctx[CLIENTS] = null
      ctx[GET_CLIENT] = null
      ctx[CREATE_CLIENT] = null
    }
  }

  provider.close = (): any => promiseChain(Object.values(pools), async (pool) => await pool.end())

  return provider
}

export const createTransactionExecutor = ({ disablePreparedTransactions = false } = {}): Executor => {
  const commitClients = disablePreparedTransactions ? UNSAFE_commit : commit

  return async (ctx, cb) => {
    const createClient = ctx[CREATE_CLIENT]
    if(!createClient) throw new Error('[CUILLERE] the transaction executor needs to be called inside a clientProvider')
    // we override the create client context function to start a transaction at client creation
    ctx[CREATE_CLIENT] = async (name) => {
      const client = await createClient(name)
      await client.query('BEGIN')
      return client
    }

    try {
      const result = await cb()
      const clients = await getClients(ctx)
      if (clients.length > 0) await commitClients(clients)
      return result
    } catch (error) {
      await rollback(await getClients(ctx))
      console.error(error)
      throw error
    }
  }
}

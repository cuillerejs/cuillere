import { Pool, PoolConfig as PgPoolConfig, PoolClient } from 'pg'
import { commit, rollback, release, UNSAFE_commit } from './transactions'
import { chain } from './utils/promise';

const PROVIDER = Symbol('PROVIDER')
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

export interface ClientProvider extends Executor {
  getPool(name: string): Pool
  end(): Promise<void>
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

export function createClientProvider(...poolConfigs: PoolConfig[]): ClientProvider {
  const pools = makePools(poolConfigs)

  const provider: ClientProvider = async (ctx, cb) => {
    if (ctx[CLIENTS]) throw new Error("[CUILLERE] this context is already in use in another provider")
    ctx[CLIENTS] = {}

    ctx[CREATE_CLIENT] = (name: string) => pools[name].connect()
    ctx[GET_CLIENT] = (pName?: string) => {
      const name = pName || DEFAULT_POOL
      if (!ctx[CLIENTS][name]) ctx[CLIENTS][name] = ctx[CREATE_CLIENT](name)
      return ctx[CLIENTS][name]
    }

    let error: Error
    try {
      return await cb()
    } catch (err) {
      error = err
    } finally {
      await release(await getClients(ctx), error)
      delete ctx[CLIENTS]
      delete ctx[GET_CLIENT]
      delete ctx[CREATE_CLIENT]
    }
  }

  provider[PROVIDER] = true

  provider.getPool = name => pools[name]

  provider.end = () => chain(Object.values(pools), pool => pool.end())

  return provider as ClientProvider
}

export const isClientProvider = (value: any): value is ClientProvider => value && value[PROVIDER]

export const createTransactionExecutor = ({ prepared = true } = {}): Executor => {
  const commitClients = prepared ? commit : UNSAFE_commit

  return async (ctx, cb) => {
    const createClient = ctx[CREATE_CLIENT]
    if (!createClient) throw new Error('[CUILLERE] the transaction executor needs to be called inside a clientProvider')
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
      const results = await rollback(await getClients(ctx))
      results.filter(({status}) => status === 'rejected').forEach(({status, reason}) => console.error(reason))
      throw error
    }
  }
}

import { Pool, PoolConfig as PgPoolConfig, PoolClient, QueryResult } from 'pg'
import { QueryConfig } from './client-manager'

export class PoolProvider {
  private pools: Record<string, Pool>

  constructor(...poolConfigs: PoolConfig[]) {
    this.pools = makePools(poolConfigs)
  }

  async connect(name = DEFAULT_POOL): Promise<PoolClient> {
    if (!this.pools[name]) throw new Error(`trying to get client for unkown pool '${name}'`)
    return this.pools[name].connect()
  }

  async query<T>(query: QueryConfig): Promise<QueryResult<T>> {
    if (!this.pools[query.pool]) throw new Error(`trying to get client for unkown pool '${query.pool}'`)
    return this.pools[query.pool].query(query)
  }

  getPool(name = DEFAULT_POOL) {
    return this.pools[name]
  }

  async end() {
    await Promise.all(Object.values(this.pools).map(
      pool => pool.end(),
    ))
  }
}

export const DEFAULT_POOL = 'DEFAULT POOL'

export interface PoolConfig extends PgPoolConfig {
  name?: string
}

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

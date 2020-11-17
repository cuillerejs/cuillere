import { Pool, PoolConfig as PgPoolConfig, PoolClient, QueryResult } from 'pg'

import type { QueryConfig } from './query-config'

export class PoolManager {
  #pools: Record<string, Pool>

  constructor(poolConfig: PoolConfig | PoolConfig[]) {
    this.#pools = makePools([].concat(poolConfig))
  }

  async connect(name?: string): Promise<PoolClient> {
    const pool = this.getPool(name)
    if (!pool) throw new Error(`trying to connect using unknown pool "${name}"`)
    return pool.connect()
  }

  async query<T>(query: QueryConfig): Promise<QueryResult<T>> {
    const pool = this.getPool(query.pool)
    if (!pool) throw new Error(`trying to get client for unknown pool "${query.pool}"`)
    return pool.query(query)
  }

  getPool(name = DEFAULT_POOL) {
    return this.#pools[name]
  }

  get pools() { return this.#pools }

  async end() {
    // FIXME Promise.allSettled ?
    await Promise.all(Object.values(this.#pools).map(
      pool => pool.end(),
    ))
  }
}

export const DEFAULT_POOL = 'DEFAULT POOL'

export interface PoolConfig extends PgPoolConfig {
  name?: string
}

const makePools = (poolConfigs: PoolConfig[]) => {
  if (poolConfigs.length <= 1) {
    const [poolConfig] = poolConfigs
    const name = (poolConfig?.name) ?? DEFAULT_POOL
    return Object.freeze({ [name]: new Pool(poolConfig) })
  }

  return Object.freeze(Object.fromEntries(
    poolConfigs.map(({ name, ...poolConfig }) => {
      if (!name) throw new TypeError('Each pool config should have a name')
      return [name, new Pool(poolConfig)]
    }),
  ))
}

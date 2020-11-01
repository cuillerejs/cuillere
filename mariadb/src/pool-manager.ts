import { PoolConfig as MariaPoolConfig, Pool, PoolConnection, createPool } from 'mariadb'

import { QueryOptions } from './query-options'

export class PoolManager {
  #pools: Record<string, Pool>

  constructor(poolConfig: PoolConfig | PoolConfig[]) {
    this.#pools = makePools([].concat(poolConfig))
  }

  async connect(name = DEFAULT_POOL): Promise<PoolConnection> {
    if (!this.#pools[name]) throw new Error(`trying to get client for unkown pool '${name}'`)
    return this.#pools[name].getConnection()
  }

  async query(query: QueryOptions) {
    if (!this.#pools[query.pool]) throw new Error(`trying to get client for unkown pool '${query.pool}'`)
    return this.#pools[query.pool].query(query)
  }

  getPool(name = DEFAULT_POOL) {
    return this.#pools[name]
  }

  get pools() { return this.#pools }

  async end() {
    await Promise.all(Object.values(this.#pools).map(
      pool => pool.end(),
    ))
  }
}

export const DEFAULT_POOL = 'DEFAULT POOL'

export interface PoolConfig extends MariaPoolConfig {
  name?: string
}

const makePools = (poolConfigs: PoolConfig[]) => {
  if (poolConfigs.length <= 1) {
    const [poolConfig] = poolConfigs
    const name = (poolConfig?.name) ?? DEFAULT_POOL
    return Object.freeze({ [name]: createPool(poolConfig) })
  }

  return Object.freeze(Object.fromEntries(
    poolConfigs.map(({ name, ...poolConfig }) => {
      if (!name) throw new TypeError('Each pool config should have a name')
      return [name, createPool(poolConfig)]
    }),
  ))
}

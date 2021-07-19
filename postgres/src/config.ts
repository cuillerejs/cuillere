import { TransactionManagerType } from '@cuillere/server-plugin'

import { PoolConfig, PoolManager } from './pool-manager'

export type PostgresConfig = {
  poolConfig?: PoolConfig | PoolConfig[]
  poolManager?: PoolManager
  queryTransactionManager?: TransactionManagerType
  mutationTransactionManager?: TransactionManagerType
}


import { ServerPlugin } from '@cuillere/server-plugin'

import { getClientManager } from './client-manager'
import { PostgresConfig } from './config'
import { postgresPlugin } from './plugin'
import { PoolManager } from './pool-manager'

export function postgresServerPlugin(config: PostgresConfig) {
  const poolManager = config?.poolManager ?? new PoolManager(config?.poolConfig)

  let serverWillStart: () => { serverWillStop: () => Promise<void> }
  if (!config?.poolManager) {
    serverWillStart = () => ({
      async serverWillStop() {
        await poolManager.end()
      },
    })
  }

  return (): ServerPlugin => ({
    httpRequestListeners() {
      return getClientManager({
        poolManager,
        transactionManager: config?.queryTransactionManager ?? 'read-only',
      })
    },
    graphqlRequestListeners(reqCtx) {
      if (reqCtx.operation.operation !== 'mutation') return
      return getClientManager({
        poolManager,
        transactionManager: config?.mutationTransactionManager ?? 'auto',
      })
    },
    plugins: postgresPlugin(),
    serverWillStart,
  })
}

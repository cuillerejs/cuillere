import { ServerPlugin } from '@cuillere/server'

import { getClientManager } from './client-manager'
import { PostgresConfig } from './config'
import { postgresPlugin } from './plugin'

export function postgresServerPlugin(config: PostgresConfig) {
  return (): ServerPlugin => ({
    httpRequestListeners() {
      return getClientManager({
        // FIXME this isn't good, this should always be a poolManager, the poolManager should be global to the server
        poolConfig: config?.poolConfig,
        poolManager: config?.poolManager,
        transactionManager: 'read-only',
      })
    },
    graphqlRequestListeners(reqCtx) {
      if (reqCtx.operation.operation !== 'mutation') return
      return getClientManager({
        // FIXME same here
        poolConfig: config?.poolConfig,
        poolManager: config?.poolManager,
        transactionManager: config?.transactionManager ?? 'auto',
      })
    },
    plugins: postgresPlugin(),
  })
}

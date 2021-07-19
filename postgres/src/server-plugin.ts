import { cuillere } from '@cuillere/core'
import { ServerContext, ServerPlugin, taskManagerPlugin, registerDatabaseProvider } from '@cuillere/server-plugin'

import { getClientManager } from './client-manager'
import { PostgresConfig } from './config'
import { buildCrud } from './crud'
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

  return (srvCtx: ServerContext): ServerPlugin => {
    registerDatabaseProvider(srvCtx, 'postgres', {
      buildCrud() {
        return cuillere(
          taskManagerPlugin(
            getClientManager({
              poolManager,
              transactionManager: 'read-only',
            }),
          ),
          postgresPlugin(),
        ).call(buildCrud)
      },
      poolManager,
    })

    return {
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
    }
  }
}

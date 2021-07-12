import type { ServerContext, ServerPlugin } from '@cuillere/server'
import { CrudProvider, registerCrudProvider } from '@cuillere/crud'

import { getClientManager } from './client-manager'
import { PostgresConfig } from './config'
import { buildCrud } from './crud'
import { postgresPlugin } from './plugin'

export function postgresServerPlugin(config: PostgresConfig) {
  return (srvCtx: ServerContext): ServerPlugin => {
    registerCrudProvider(srvCtx, 'postgres', crudProvider)

    return {
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
    }
  }
}

const crudProvider: CrudProvider = {
  buildCrud,
}

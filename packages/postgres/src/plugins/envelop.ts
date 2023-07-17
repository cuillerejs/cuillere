import { type Plugin, isAsyncIterable } from '@envelop/core'
import { addPlugins } from '@cuillere/envelop'
import { SyncTaskManager } from '@cuillere/server-plugin'
import { PoolManager } from '../pool-manager'
import { type PostgresContext, type PostgresPluginOptions, postgresPlugin } from './cuillere'
import { getClientManager } from '../client-manager'

export function usePostgres({ pool, transactionManager }: PostgresPluginOptions): Plugin<PostgresContext> {
  const poolManager = pool instanceof PoolManager ? pool : new PoolManager(pool)

  let cllrContextKey: string

  return {
    onPluginInit({ plugins }) {
      cllrContextKey = addPlugins(plugins, [postgresPlugin({ pool: poolManager, transactionManager })]).contextContextField
    },
    onExecute({ args: { contextValue } }) {
      // If the clientManager is already present, it means the transaction is handled somewhere else
      if (contextValue._clientManager) {
        contextValue[cllrContextKey]._clientManager = contextValue._clientManager
        return
      }

      contextValue[cllrContextKey]._clientManager = getClientManager({ poolManager, transactionManager })

      return {
        async onExecuteDone({ result, args: { contextValue } }) {
          // If the clientManager is already present, it means the transaction is handled somewhere else
          if (contextValue._clientManager) {
            return
          }

          const { [cllrContextKey]: { _clientManager } } = contextValue

          const taskManager = new SyncTaskManager(_clientManager)

          if (isAsyncIterable(result)) {
            let hasError = false
            return {
              onNext: async ({ result }) => {
                if (result.errors?.length > 0) {
                  hasError = true
                }
              },
              onEnd() {
                taskManager.done(hasError)
              },
            }
          }

          await taskManager.done(result.errors?.length > 0)
        },
      }
    },
  }
}

import { Plugin, isAsyncIterable } from '@envelop/core'
import { addPlugins } from '@cuillere/envelop'
import { PoolManager } from './pool-manager'
import { PostgresContext, PostgresPluginOptions, postgresPlugin } from './plugin'
import { getClientManager } from './client-manager'

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
        onExecuteDone({ result, args: { contextValue } }) {
          const { [cllrContextKey]: { _clientManager } } = contextValue

          function onEnd(errors: readonly any[]) {
            let hasErrors = errors.length > 0
            try {
              return errors.length ? _clientManager.error(errors) : _clientManager.complete(result)
            } catch (error) {
              hasErrors = true
              throw error
            } finally {
              _clientManager.finalize(hasErrors)
            }
          }

          if (isAsyncIterable(result)) {
            const errors = []
            return {
              onNext: async ({ result }) => {
                if (result.errors) {
                  errors.push(...result.errors)
                }
              },
              onEnd() {
                onEnd(errors)
              },
            }
          }

          onEnd(result.errors || [])
        },
      }
    },
  }
}

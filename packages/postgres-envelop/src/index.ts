import { ensurePlugin, IS_CUILLERE_PLUGIN, isTransactionsPlugin, useTransactions, CuillereEnvelopPlugin } from '@cuillere/envelop'
import { PostgresConfig, PoolManager, postgresPlugin, getClientManager } from '@cuillere/postgres'

export interface PostgresPlugin extends CuillereEnvelopPlugin {
  end(): Promise<void> | void
}

export function usePostgres(config: PostgresConfig): PostgresPlugin {
  const poolManager = config?.poolManager ?? new PoolManager(config?.poolConfig)

  return {
    [IS_CUILLERE_PLUGIN]: true,
    cuillere: {
      plugins: [postgresPlugin()],
    },
    end() {
      // call end() only if a PoolManager was given in config
      return config?.poolManager?.end()
    },

    onPluginInit({ plugins, addPlugin }) {
      const transactionsPlugin = ensurePlugin(plugins, addPlugin, isTransactionsPlugin, useTransactions)

      transactionsPlugin.addTaskListener({
        query: getClientManager({
          poolManager, transactionManager: config?.queryTransactionManager ?? 'read-only',
        }),
        mutation: getClientManager({
          poolManager, transactionManager: config?.mutationTransactionManager ?? 'auto',
        }),
      })
    },
  }
}

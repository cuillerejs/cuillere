import { ensurePlugin, IS_CUILLERE_PLUGIN, isTransactionsPlugin, useTransactions, CuillereEnvelopPlugin } from '@cuillere/envelop'
import { PoolManager, connectionPlugin, getConnectionManager } from '@cuillere/mariadb'
import { PoolConfig } from 'mariadb'
import { TransactionManagerType } from '@cuillere/server-plugin'

export interface MariaPlugin extends CuillereEnvelopPlugin {
  end(): Promise<void> | void
}

export interface MariaConfig {
  poolConfig?: PoolConfig
  poolManager?: PoolManager
  queryTransactionManager?: TransactionManagerType
  mutationTransactionManager?: TransactionManagerType
}

export function useMaria(config: MariaConfig): MariaPlugin {
  const poolManager = config?.poolManager ?? new PoolManager(config?.poolConfig)

  return {
    [IS_CUILLERE_PLUGIN]: true,
    cuillere: {
      plugins: [connectionPlugin()],
    },
    end() {
      // call end() only if a PoolManager was given in config
      return config?.poolManager?.end()
    },

    onPluginInit({ plugins, addPlugin }) {
      const transactionsPlugin = ensurePlugin(plugins, addPlugin, isTransactionsPlugin, useTransactions)

      transactionsPlugin.addTaskListener({
        query: getConnectionManager({
          poolManager, transactionManager: config?.queryTransactionManager ?? 'read-only',
        }),
        mutation: getConnectionManager({
          poolManager, transactionManager: config?.mutationTransactionManager ?? 'auto',
        }),
      })
    },
  }
}

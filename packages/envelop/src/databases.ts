import type {Plugin as EnvelopPlugin} from '@envelop/core'
import {getClientManager, PoolManager, PostgresConfig, postgresPlugin} from "@cuillere/postgres";
import {TaskListener} from "@cuillere/server-plugin";
import {CuillereEnvelopPlugin, IS_CUILLERE_PLUGIN, isCuillereCoreEnvelopPlugin, useCuillere} from "./envelop";
import {handleStreamOrSingleExecutionResult, isAsyncIterable} from "@envelop/core";

export function usePostgres(config: PostgresConfig): PostgresPlugin {
  const poolManager = config?.poolManager ?? new PoolManager(config?.poolConfig)
  
  return {
    [IS_CUILLERE_PLUGIN]: true,
    cuillere: {
      plugins: [postgresPlugin()]
    },
    end: config?.poolManager ? () => {} : () => poolManager.end(),
    
    onPluginInit({ plugins, addPlugin }) {
      let transactionsPlugin = plugins.find(isTransactionsPlugin)
      if (!transactionsPlugin) {
        transactionsPlugin = useTransactions({})
        addPlugin(transactionsPlugin)
      }
      
      transactionsPlugin.addTaskListener({
        query: getClientManager({
          poolManager, transactionManager: config.queryTransactionManager ?? 'read-only',
        }),
        mutation: getClientManager({
          poolManager, transactionManager: config.mutationTransactionManager ?? 'auto',
        })
      })
    }
  }
}

export function useTransactions(options): TransactionsPlugin {
  const listeners: { query: TaskListener[], mutation: TaskListener[] } = { query: [], mutation: [] }
  return {
    [IS_TRANSACTIONS_PLUGIN]: true,
    addTaskListener({ query, mutation }) {
      listeners.query.push(query)
      listeners.mutation.push(mutation)
    },
    
    onPluginInit({ plugins, addPlugin }) {
      if(!plugins.find(isCuillereCoreEnvelopPlugin)) addPlugin(useCuillere())
    },
    
    async onExecute({ args: { contextValue } }) {
      const operationType = getOperationType(contextValue)
      if(operationType != 'query' && operationType != 'mutation') return
      const operationListeners = listeners[operationType]
      
      await Promise.all(operationListeners.map(listener =>
        listener.initialize(contextValue)
      ))
      
      return {
        async onExecuteDone({result}) {
          if(isAsyncIterable(result)) throw TypeError('Async Iterable results are not implemented')
          let error
          try {
            if(result.errors) {
              await Promise.all(operationListeners.map(listener => listener.error(result.errors[0])))
              error = result.errors[0]
            } else {
              await Promise.all(operationListeners.map(listener => listener.complete(result)))
            }
          } catch (err) {
            error = err
            await Promise.all(operationListeners.map(listener => listener.error(err)))
          } finally {
            await Promise.all(operationListeners.map(listener => listener.finalize(error)))
          }
        }
      }
    }
  }
}

export function isTransactionsPlugin(plugin: EnvelopPlugin | TransactionsPlugin): plugin is TransactionsPlugin {
  return plugin[IS_TRANSACTIONS_PLUGIN]
}

const IS_TRANSACTIONS_PLUGIN = Symbol("IS_TRANSACTIONS_PLUGIN")
interface TransactionsPlugin extends EnvelopPlugin {
  [IS_TRANSACTIONS_PLUGIN]: true
  addTaskListener(listener: { query: TaskListener, mutation: TaskListener }): void
}

export interface PostgresPlugin extends CuillereEnvelopPlugin {
  end(): Promise<void> | void
}

function getOperationType(ctx: any): string {
  return ctx?.operation?.operation
}

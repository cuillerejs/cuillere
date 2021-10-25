import type {Plugin as EnvelopPlugin} from '@envelop/core'
import {getClientManager, PoolManager, PostgresConfig, postgresPlugin} from "@cuillere/postgres";
import {TaskListener} from "@cuillere/server-plugin";
import {
  CuillereCoreEnvelopPlugin,
  CuillereEnvelopPlugin,
  IS_CUILLERE_PLUGIN,
  isCuillereCoreEnvelopPlugin,
  useCuillere
} from "./envelop";
import {isAsyncIterable} from "@envelop/core";
import {AsyncTaskManager} from "@cuillere/server-plugin";

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
        transactionsPlugin = useTransactions()
        addPlugin(transactionsPlugin)
      }
      
      transactionsPlugin.addTaskListener({
        query: getClientManager({
          poolManager, transactionManager: config?.queryTransactionManager ?? 'read-only',
        }),
        mutation: getClientManager({
          poolManager, transactionManager: config?.mutationTransactionManager ?? 'auto',
        })
      })
    }
  }
}

export function useTransactions(): TransactionsPlugin {
  const listeners: { query: TaskListener[], mutation: TaskListener[] } = { query: [], mutation: [] }
  
  let cllrPlugin: CuillereCoreEnvelopPlugin
  return {
    [IS_TRANSACTIONS_PLUGIN]: true,
    addTaskListener({ query, mutation }) {
      listeners.query.push(query)
      listeners.mutation.push(mutation)
    },
    
    onPluginInit({ plugins, addPlugin }) {
      cllrPlugin = plugins.find(isCuillereCoreEnvelopPlugin)
      if(!cllrPlugin) {
        cllrPlugin = useCuillere()
        addPlugin(cllrPlugin)
      }
    },
    
    async onExecute({ args: { contextValue } }) {
      const operationType = getOperationType(contextValue)
      if(operationType != 'query' && operationType != 'mutation') return
      
      let resolve, reject
      const taskPromise = new AsyncTaskManager(...listeners[operationType]).execute(() => new Promise((res, rej) => {
        resolve = res
        reject = rej
      }), contextValue[cllrPlugin.contextKey])
      
      return {
        async onExecuteDone({ result }) {
          if(isAsyncIterable(result)) throw TypeError('Async Iterable results are not implemented')
          if(result.errors) {
            reject(result.errors)
          }
          else resolve()
          await taskPromise.catch(() => {})
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

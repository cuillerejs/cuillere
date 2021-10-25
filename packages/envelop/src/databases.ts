import type {Plugin as EnvelopPlugin} from '@envelop/core'
import {TaskListener} from "@cuillere/server-plugin";
import {CuillereCoreEnvelopPlugin, ensurePlugin, isCuillereCoreEnvelopPlugin, useCuillere} from "./envelop";
import {isAsyncIterable} from "@envelop/core";
import {AsyncTaskManager} from "@cuillere/server-plugin";

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
      cllrPlugin = ensurePlugin(plugins, addPlugin, isCuillereCoreEnvelopPlugin, useCuillere)
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

function getOperationType(ctx: any): string {
  return ctx?.operation?.operation
}

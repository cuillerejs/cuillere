import { type Plugin, finalAsyncIterator, isAsyncIterable, mapAsyncIterator } from 'graphql-yoga'
import { SyncTaskManager } from '@cuillere/server-plugin'
import { usePostgres as usePostgresEnvelop } from './envelop'
import type { PostgresContext, PostgresPluginOptions } from './cuillere'
import { PoolManager } from '../pool-manager'
import { type ClientManager, getClientManager } from '../client-manager'
import { isMutation } from '../utils'

export function usePostgres({ pool, transactionManager }: PostgresPluginOptions): Plugin<PostgresContext> {
  const poolManager = pool instanceof PoolManager ? pool : new PoolManager(pool)
  const clientManagersByRequest = new WeakMap<Request, [ClientManager, number[]]>()

  return {
    onPluginInit({ addPlugin }) {
      addPlugin({
        onExecute({ args: { contextValue, document } }) {
          // The shared client manager and transaction are only used for side effects free queries
          // Mutations and subscriptions will have their own client manager and transaction, handled by the envelop plugin
          if (!isMutation(document)) {
            [contextValue._clientManager] = clientManagersByRequest.get(contextValue.request)
          }
        },
      })
      addPlugin(usePostgresEnvelop({ pool: poolManager, transactionManager }))
    },

    onRequestParse({ request }) {
      return {
        onRequestParseDone({ requestParserResult }) {
          const toSkip: number[] = []
          if (Array.isArray(requestParserResult)) {
            requestParserResult.forEach(({ query }, index) => {
              if (shouldSkip(query)) {
                toSkip.push(index)
              }
            })
          }
          clientManagersByRequest.set(request, [getClientManager({ poolManager, transactionManager }), toSkip])
        },
      }
    },

    async onResultProcess({ request, result, setResult }) {
      const r = clientManagersByRequest.get(request)
      const [clientManager, toSkip] = r
      clientManagersByRequest.delete(request)

      const taskManager = new SyncTaskManager(clientManager)

      if (isAsyncIterable(result)) {
        let hasErrors = false
        let r = mapAsyncIterator(result, async (result) => {
          if (result.errors?.length > 0) {
            hasErrors = true
          }
          return result
        })

        r = finalAsyncIterator(r, () => taskManager.done(hasErrors))
        setResult(r)
        return
      }

      if (Array.isArray(result)) {
        await taskManager.done(result.some((r, index) => r.errors?.length > 0 && !toSkip.includes(index)))
      } else {
        await taskManager.done(result.errors?.length > 0)
      }
    },
  }
}

function shouldSkip(query: string) {
  return query.includes('mutation') || query.includes('subscription')
}

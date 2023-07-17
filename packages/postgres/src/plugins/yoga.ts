import { type Plugin, finalAsyncIterator, isAsyncIterable, mapAsyncIterator } from 'graphql-yoga'
import { CuillereEnvelopPluginOptions, getConfig } from '@cuillere/envelop'
import { SyncTaskManager } from '@cuillere/server-plugin'
import { usePostgres as usePostgresEnvelop } from './envelop'
import type { PostgresContext, PostgresPluginOptions } from './cuillere'
import { PoolManager } from '../pool-manager'
import { type ClientManager, getClientManager } from '../client-manager'
import { isMutation } from '../utils'

export function usePostgres({ pool, transactionManager }: PostgresPluginOptions): Plugin<PostgresContext> {
  const poolManager = pool instanceof PoolManager ? pool : new PoolManager(pool)
  const clientManagersByRequest = new WeakMap<Request, { clientManager: ClientManager; toSkip: number[]; cllrCtx: any }>()

  let cllrConfig: CuillereEnvelopPluginOptions

  return {
    onPluginInit({ addPlugin, plugins }) {
      cllrConfig = getConfig(plugins)

      addPlugin({
        onExecute({ args: { contextValue, document } }) {
          // The shared client manager and transaction are only used for side effects free queries
          // Mutations and subscriptions will have their own client manager and transaction, handled by the envelop plugin
          if (!isMutation(document)) {
            const { clientManager, cllrCtx } = clientManagersByRequest.get(contextValue.request)
            contextValue._clientManager = clientManager
            // FIXME: This is wrong. Since the cllr context is shared among all the queries, the graphqlContext can't be set here
            //        Thes graphql context will be equal to the last executed query's context, which is not wanted
            cllrCtx.graphQLContext = contextValue
            contextValue[cllrConfig.instanceContextField] = contextValue[cllrConfig.instanceContextField].context(cllrCtx)
            contextValue[cllrConfig.contextContextField] = cllrCtx
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
          clientManagersByRequest.set(request, { clientManager: getClientManager({ poolManager, transactionManager }), toSkip, cllrCtx: {} })
        },
      }
    },

    async onResultProcess({ request, result, setResult }) {
      if (!clientManagersByRequest.has(request)) {
        return
      }
      const { clientManager, toSkip } = clientManagersByRequest.get(request)
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

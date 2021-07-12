import type {
  ApolloServerPlugin,
  GraphQLRequestContextExecutionDidStart,
  BaseContext,
  GraphQLServiceContext,
  GraphQLServerListener,
} from 'apollo-server-plugin-base'
import { all, call, executablePromise } from '@cuillere/core'

import { CuillereConfig, ValueOrPromise } from './types'
import { CuillereServerListener, makeAsyncTaskManagerGetterForListenerGetters, ServerPlugin } from './server-plugin'
import { GetAsyncTaskManager } from './task-manager'
import { CUILLERE_INSTANCE } from './schema'

export type ApolloServerPluginArgs = [GraphQLRequestContextExecutionDidStart<BaseContext>]

export function apolloServerPlugin(config: CuillereConfig, plugins: ServerPlugin[]): ApolloServerPlugin {
  let getTaskManager: GetAsyncTaskManager<ApolloServerPluginArgs>

  const listenerGetters = plugins.flatMap(plugin => plugin.graphqlRequestListeners ?? [])
  if (listenerGetters.length !== 0) getTaskManager = makeAsyncTaskManagerGetterForListenerGetters(listenerGetters)

  let serverWillStart: (service: GraphQLServiceContext) => ValueOrPromise<GraphQLServerListener>

  const serverWillStarts = plugins
    .map(plugin => plugin.serverWillStart)
    .filter(fn => fn != null)
  if (serverWillStarts.length !== 0) {
    serverWillStart = async (srvCtx) => {
      const srvListeners: CuillereServerListener[] = await srvCtx.schema[CUILLERE_INSTANCE].start(all(serverWillStarts.map(fn => call(fn, srvCtx))))
      return {
        async serverWillStop() {
          const serverWillStops = srvListeners
            .filter(srvListener => srvListener?.serverWillStop != null)
            .map(srvListener => srvListener.serverWillStop)
          if (serverWillStops.length === 0) return
          await srvCtx.schema[CUILLERE_INSTANCE].start(all(serverWillStops.map(fn => call(fn))))
        },
      }
    }
  }

  if (getTaskManager == null && serverWillStart == null) return null

  function getContext(reqCtx: GraphQLRequestContextExecutionDidStart<BaseContext>) {
    return reqCtx.context[config.contextKey] = {}
  }

  return {
    serverWillStart,

    requestDidStart() {
      let didEncounterErrors = false

      return {
        // WORKAROUND: https://github.com/cuillerejs/cuillere/issues/25
        didEncounterErrors() {
          didEncounterErrors = true
        },

        executionDidStart(reqCtx) {
          const taskManager = getTaskManager(reqCtx)

          if (!taskManager) return undefined

          const [task, resolve, reject] = executablePromise()

          taskManager
            .execute(() => task, getContext(reqCtx))
            .catch(() => { /* Avoids unhandled promise rejection */ })

          return () => {
            if (didEncounterErrors) reject(true)
            else resolve()
          }
        },
      }
    },
  }
}

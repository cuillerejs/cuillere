import type {
  ApolloServerPlugin,
  GraphQLRequestContextExecutionDidStart,
  BaseContext,
  GraphQLServiceContext,
  GraphQLServerListener,
} from 'apollo-server-plugin-base'
import { executablePromise } from '@cuillere/core'

import { CuillereConfig, ValueOrPromise } from './types'
import { ServerPlugin } from './server-plugin'
import { AsyncTaskManager, GetTaskManager, TaskListener } from './task-manager'

export type ApolloServerPluginArgs = [GraphQLRequestContextExecutionDidStart<BaseContext>]

export function apolloServerPlugin(config: CuillereConfig, plugins: ServerPlugin[]): ApolloServerPlugin {
  let getTaskManager: GetTaskManager<AsyncTaskManager, ApolloServerPluginArgs>

  const listenerGetters = plugins.flatMap(plugin => plugin.graphqlRequestListeners ?? [])
  if (listenerGetters.length !== 0) {
    getTaskManager = (...args) => {
      const listeners = listenerGetters
        .map(listenerGetter => listenerGetter(...args))
        .filter((listener): listener is TaskListener => listener != null)
      if (listeners.length === 0) return
      return new AsyncTaskManager(...listeners)
    }
  }

  let serverWillStart: (service: GraphQLServiceContext) => ValueOrPromise<GraphQLServerListener | void>

  const serverWillStarts = plugins
    .map(plugin => plugin.serverWillStart)
    .filter(fn => fn != null)
  if (serverWillStarts.length !== 0) {
    serverWillStart = async (srvCtx) => {
      const srvListeners = await Promise.all(serverWillStarts.map(fn => fn(srvCtx)))
      return {
        async serverWillStop() {
          await Promise.all(srvListeners.map((listener?: GraphQLServerListener) => listener?.serverWillStop?.()))
        },
      }
    }
  }

  if (getTaskManager == null && serverWillStart == null) return null

  function getContext(reqCtx: GraphQLRequestContextExecutionDidStart<BaseContext>) {
    return reqCtx.context[config.contextKey] = {} // eslint-disable-line no-return-assign
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

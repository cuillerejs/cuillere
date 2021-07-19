import type {
  ApolloServerPlugin,
  GraphQLRequestContextExecutionDidStart,
  BaseContext,
  GraphQLServerListener,
} from 'apollo-server-plugin-base'
import { executablePromise } from '@cuillere/core'

import { CuillereConfig } from './types'
import { makeAsyncTaskManagerGetterFromListenerGetters, ServerPlugin } from './server-plugin'

export type ApolloServerPluginArgs = [GraphQLRequestContextExecutionDidStart<BaseContext>]

export function apolloServerPlugin(config: CuillereConfig, plugins: ServerPlugin[]): ApolloServerPlugin {
  const requestDidStart = makeRequestDidStart(config, plugins)
  const serverWillStart = makeServerWillStart(plugins)

  if (requestDidStart == null && serverWillStart == null) return null

  return {
    serverWillStart,
    requestDidStart,
  }
}

function makeServerWillStart(plugins: ServerPlugin[]): ApolloServerPlugin['serverWillStart'] {
  const serverWillStarts = plugins
    .filter(plugin => plugin.serverWillStart != null)
    .map(plugin => plugin.serverWillStart)

  if (serverWillStarts.length === 0) return null

  return async (srvCtx) => {
    const srvListeners = await Promise.all(serverWillStarts.map(fn => fn(srvCtx)))
    const serverWillStops = srvListeners
      .filter((srvListener): srvListener is GraphQLServerListener => srvListener != null)
      .filter(srvListener => srvListener.serverWillStop != null)
      .map(srvListener => srvListener.serverWillStop)
    if (serverWillStops.length === 0) return
    return {
      async serverWillStop() {
        await Promise.all(serverWillStops.map(fn => fn()))
      },
    }
  }
}

function makeRequestDidStart(config: CuillereConfig, plugins: ServerPlugin[]): ApolloServerPlugin['requestDidStart'] {
  const listenerGetters = plugins.flatMap(plugin => plugin.graphqlRequestListeners ?? [])
  if (listenerGetters.length === 0) return null

  const getTaskManager = makeAsyncTaskManagerGetterFromListenerGetters(listenerGetters)

  return () => {
    let didEncounterErrors = false

    return {
      // WORKAROUND: https://github.com/cuillerejs/cuillere/issues/25
      didEncounterErrors() {
        didEncounterErrors = true
      },

      executionDidStart(reqCtx) {
        const taskManager = getTaskManager?.(reqCtx)

        if (!taskManager) return undefined

        const [task, resolve, reject] = executablePromise()

        taskManager
          .execute(() => task, reqCtx.context[config.contextKey] = {})
          .catch(() => { /* Avoids unhandled promise rejection */ })

        return () => {
          if (didEncounterErrors) reject(true)
          else resolve()
        }
      },
    }
  }
}

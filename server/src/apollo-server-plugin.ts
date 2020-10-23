import type { ApolloServerPlugin, GraphQLRequestContextExecutionDidStart, BaseContext } from 'apollo-server-plugin-base'
import { executablePromise } from '@cuillere/core'

import { AsyncTaskExecutorOptions } from './task-executor'

export type ApolloServerPluginArgs = [GraphQLRequestContextExecutionDidStart<BaseContext>]

export function apolloServerPlugin(options: AsyncTaskExecutorOptions<ApolloServerPluginArgs>): ApolloServerPlugin {
  return {
    requestDidStart() {
      let didEncounterErrors = false

      return {
        // WORKAROUND: https://github.com/cuillerejs/cuillere/issues/25
        didEncounterErrors() {
          didEncounterErrors = true
        },

        executionDidStart(reqCtx) {
          const taskManager = options.taskManager(reqCtx)

          if (!taskManager) return undefined

          const [task, resolve, reject] = executablePromise()

          taskManager
            .execute(() => task, options.context(reqCtx))
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

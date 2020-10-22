import type { ApolloServerPlugin as ApolloServerPluginBase, GraphQLRequestContextExecutionDidStart, BaseContext } from 'apollo-server-plugin-base'
import { executablePromise } from '@cuillere/core'

import { AsyncTaskManager } from './task-manager'

export interface ApolloServerPluginOptions {
  context(reqCtx: GraphQLRequestContextExecutionDidStart<BaseContext>): any
  taskManager(reqCtx: GraphQLRequestContextExecutionDidStart<BaseContext>): AsyncTaskManager
}

export function ApolloServerPlugin(options: ApolloServerPluginOptions): ApolloServerPluginBase {
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
            .execute(options.context(reqCtx), () => task)
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

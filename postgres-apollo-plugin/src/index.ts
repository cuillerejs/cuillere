import type { ApolloServerPlugin } from 'apollo-server-plugin-base'
import { getClientManager, ClientManagerOptions } from '@cuillere/postgres'
import { executablePromise } from '@cuillere/core/lib/utils/promise'

export interface PostgresApolloPluginOptions extends ClientManagerOptions {
  contextKey?: string
}

export function PostgresApolloPlugin(options: PostgresApolloPluginOptions): ApolloServerPlugin {
  const contextKey = options.contextKey ?? 'cuillere'

  return {
    requestDidStart() {
      let didEncounterErrors = false

      return {
        // WORKAROUND: https://github.com/EmrysMyrddin/cuillere/issues/25
        didEncounterErrors() {
          didEncounterErrors = true
        },

        executionDidStart(reqCtx) {
          if (contextKey in reqCtx.context && reqCtx.operation.operation !== 'mutation') return undefined

          const [task, resolve, reject] = executablePromise()

          // FIXME no transactionManager if no mutation

          getClientManager(options)
            .execute(reqCtx.context[contextKey] = {}, () => task)
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

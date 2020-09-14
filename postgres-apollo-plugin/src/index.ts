import type { ApolloServerPlugin } from 'apollo-server-plugin-base'
import { getClientManager, ClientManagerOptions } from '@cuillere/postgres'
import { executablePromise } from '@cuillere/core/lib/utils/promise'

export function CuillerePostgresApolloPlugin(options: ClientManagerOptions): ApolloServerPlugin {
  return {
    requestDidStart() {
      let didEncounterErrors = false

      return {
        didEncounterErrors() {
          didEncounterErrors = true
        },

        executionDidStart({ context }) {
          const [task, resolve, reject] = executablePromise()

          getClientManager(options)
            .execute(context, () => task)
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

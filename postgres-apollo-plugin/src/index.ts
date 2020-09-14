import type { ApolloServerPlugin } from 'apollo-server-plugin-base'
import type { GraphQLError } from 'graphql'
import { getClientManager, ClientManagerOptions } from '@cuillere/postgres'
import { executablePromise } from '@cuillere/core/lib/utils/promise'

export const CuillerePostgresApolloPlugin = (options: ClientManagerOptions): ApolloServerPlugin => ({
  requestDidStart() {
    let errors: readonly GraphQLError[]

    return {
      didEncounterErrors(reqCtx) {
        errors = reqCtx.errors
      },

      executionDidStart({ context }) {
        const [task, resolve, reject] = executablePromise()

        getClientManager(options).execute(context, () => task)

        return () => {
          if (errors) reject(errors)
          else resolve()
        }
      },
    }
  },
})

import type { ApolloServerPlugin } from 'apollo-server-plugin-base'
import type { TransactionManagerOptions } from '@cuillere/postgres'
import { TransactionManager } from '@cuillere/postgres'

export const CuillerePostgresApolloPlugin = (options: TransactionManagerOptions): ApolloServerPlugin => ({
  requestDidStart() {
    let shouldRollback = false
    return {
      didEncounterErrors() { shouldRollback = true },
      executionDidStart({ context }) {
        const manager = new TransactionManager(options)
        manager.setupContext(context)
        return () => (shouldRollback ? manager.rollback() : manager.commit())
      },
    }
  },
})

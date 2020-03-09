import type { ApolloServerPlugin } from 'apollo-server-plugin-base'
import { ProviderMiddlewareOptions, TransactionManagerOptions, PoolProvider, TransactionManager, setQueryHandler } from '@cuillere/postgres'

export const CuillerePostgresApolloPlugin = (
  options: ProviderMiddlewareOptions,
  transactionOptions: TransactionManagerOptions,
): ApolloServerPlugin => {
  const provider = options.poolProvider ?? new PoolProvider(...options.poolConfigs)

  return ({
    requestDidStart: () => ({
      executionDidStart({ context }) {
        const manager = new TransactionManager(provider, transactionOptions)
        setQueryHandler(context, query => manager.query(query))

        return err => (err ? manager.rollback() : manager.commit())
      },
    }),
  })
}

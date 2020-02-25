import type { ApolloServerPlugin } from 'apollo-server-plugin-base'
import { TransactionMiddlewareOptions, PoolProvider, TransactionManager, setQueryHandler } from '@cuillere/postgres'

export const CuillerePostgresApolloPlugin = (
  { prepared, ...options }: TransactionMiddlewareOptions,
): ApolloServerPlugin => {
  const provider = options.poolProvider ?? new PoolProvider(...options.poolConfigs)

  return ({
    requestDidStart: () => ({
      executionDidStart({ context }) {
        const manager = new TransactionManager(provider, { prepared })
        setQueryHandler(context, query => manager.query(query))

        return err => (err ? manager.rollback() : manager.commit())
      },
    }),
  })
}

import { GeneratorFunction, get, call } from '@cuillere/core'
import type { ApolloServerPlugin } from 'apollo-server-plugin-base'
import { ProviderMiddlewareOptions, TransactionManagerOptions, PoolProvider, TransactionManager, setQueryHandler } from '@cuillere/postgres'
import { Client } from 'pg'

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
        context.getClient = (pool: string) => manager.getClient(pool)

        return err => (err ? manager.rollback() : manager.commit())
      },
    }),
  })
}

const getClientImpl: GeneratorFunction<[string], Client> = function* getClient(name: string) {
  const getClientFn = yield get('getClient')
  return getClientFn(name)
}

export const getClient = (name: string) => call(getClientImpl, name)

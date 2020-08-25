import { GeneratorFunction, get, call } from '@cuillere/core'
import type { ApolloServerPlugin } from 'apollo-server-plugin-base'
import { ProviderPluginOptions, TransactionManagerOptions, PoolProvider, TransactionManager, setQueryHandler } from '@cuillere/postgres'
import { Client } from 'pg'

export const CuillerePostgresApolloPlugin = (
  options: ProviderPluginOptions,
  transactionOptions: TransactionManagerOptions,
): ApolloServerPlugin => {
  const provider = options.poolProvider ?? new PoolProvider(...options.poolConfigs)

  return ({
    requestDidStart() {
      let shouldRollback = false
      return {
        didEncounterErrors() { shouldRollback = true },
        executionDidStart({ context }) {
          const manager = new TransactionManager(provider, transactionOptions)
          setQueryHandler(context, query => manager.query(query))
          context.getClient = (pool: string) => manager.getClient(pool)
          return () => (shouldRollback ? manager.rollback() : manager.commit())
        },
      }
    },
  })
}

const getClientImpl: GeneratorFunction<[string], Client> = async function* getClient(name: string) {
  const getClientFn = yield get('getClient')
  return getClientFn(name)
}

export const getClient = (name: string) => call(getClientImpl, name)

import { Middleware, next, Operation, Wrapper } from '@cuillere/core'
import { PoolProvider, PoolConfig } from '../pool-provider'
import { setQueryHandler } from './query'
import { ClientManager } from '../client-manager'
import { TransactionManager, TransactionManagerOptions } from '../transaction-manager'

export function poolMiddleware(options: ProviderMiddlewareOptions): Middleware {
  return makeProviderMiddleware(options, provider => new ClientManager(provider))
}

export function transactionMiddleware(
  options: ProviderMiddlewareOptions,
  transactionOptions?: TransactionManagerOptions,
): Middleware {
  return makeProviderMiddleware(options, provider =>
    new TransactionManager(provider, transactionOptions))
}

export interface ProviderMiddlewareOptions {
  poolProvider?: PoolProvider
  poolConfigs?: PoolConfig[]
}

function makeProviderMiddleware(
  options: ProviderMiddlewareOptions,
  clientManagerFactory: (provider: PoolProvider) => ClientManager,
): Middleware {
  function createClientManager() {
    const provider = options.poolProvider ?? new PoolProvider(...options.poolConfigs)
    return clientManagerFactory(provider)
  }

  return {
    async* start(operation: Wrapper, ctx: ProviderContext) {
      const clientManager = ctx[MANAGER] = createClientManager()
      setQueryHandler(ctx, query => clientManager.query(query))
      return yield* clientManager.transactionalYield(next(operation))
    },

    async* getClient(operation: GetClientOperation, ctx: ProviderContext) {
      return ctx[MANAGER].getClient(operation.name)
    },
  }
}

export function getClient(name: string): GetClientOperation {
  return { kind: 'getClient', name }
}

interface GetClientOperation extends Operation {
  name?: string
}

const MANAGER = Symbol('MANAGER')
interface ProviderContext {
  [MANAGER]: ClientManager
}

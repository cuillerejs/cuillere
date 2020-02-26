import { Middleware, isStart, delegate, next, makeOperation, Operation } from '@cuillere/core'
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

  return async function* provideriddleware(operation, ctx: ProviderContext) {
    if (isStart(operation)) {
      const clientManager = ctx[MANAGER] = createClientManager()
      setQueryHandler(ctx, query => clientManager.query(query))

      return yield* clientManager.transactionalYield(next(operation))
    }

    if (isGetClient(operation)) {
      return ctx[MANAGER].getClient(operation.name)
    }

    return yield delegate(operation)
  }
}

export const [getClient, isGetClient] = makeOperation(
  Symbol('GET_CLIENT'),
  (operation, name?: string): GetClient => ({ ...operation, name }),
)

interface GetClient extends Operation {
  name?: string
}

const MANAGER = Symbol('MANAGER')
interface ProviderContext {
  [MANAGER]: ClientManager
}

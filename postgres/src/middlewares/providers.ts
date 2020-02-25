import { Middleware, isStart, delegate, next } from '@cuillere/core'
import { PoolProvider, PoolConfig } from '../pool-provider'
import { setQueryHandler } from './query'
import { ClientManager } from '../client-manager'
import { TransactionManager } from '../transaction-manager'

export function poolMiddleware(options: ProviderMiddlewareOptions): Middleware {
  return makeProviderMiddleware(options, provider => new ClientManager(provider))
}

export function transactionMiddleware(options: TransactionMiddlewareOptions): Middleware {
  const prepared = options.prepared ?? true
  return makeProviderMiddleware(options, provider => new TransactionManager(provider, { prepared }))
}

export interface ProviderMiddlewareOptions {
  poolProvider?: PoolProvider
  poolConfigs?: PoolConfig[]
}

interface TransactionMiddlewareOptions extends ProviderMiddlewareOptions{
  prepared?: boolean
}

function makeProviderMiddleware(
  options: ProviderMiddlewareOptions,
  clientManagerFactory: (provider: PoolProvider) => ClientManager,
): Middleware {
  function createClientManager() {
    const provider = options.poolProvider ?? new PoolProvider(...options.poolConfigs)
    return clientManagerFactory(provider)
  }

  return async function* transactionMiddleware(operation, ctx: any) {
    console.log('transaction')
    if (!isStart(operation)) return yield delegate(operation)

    console.log('transaction - start')

    const clientManager = createClientManager()
    setQueryHandler(ctx, query => clientManager.query(query))

    return yield* clientManager.transactionalYield(next(operation))
  }
}

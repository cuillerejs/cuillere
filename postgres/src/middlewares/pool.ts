import { isStart, Middleware } from '@cuillere/core'
import { PoolConfig, ClientProvider, createClientProvider, isClientProvider, getClient as getClientFn } from '../postgres'

const GET_CLIENT = Symbol('GET_CLIENT')

interface GetClient {
  [GET_CLIENT]: true
  name?: string
}

export const getClient = (name?: string): GetClient => ({
  [GET_CLIENT]: true,
  name,
})

const isGetClient = (operation: any): operation is GetClient => operation && operation[GET_CLIENT]

interface PoolMiddleware extends Middleware {
  end(): Promise<void>
}

export function poolMiddleware(...args: [ClientProvider] | PoolConfig[]): PoolMiddleware {
  let provider: ClientProvider
  if (isClientProvider(args[0])) {
    [provider] = args
  } else {
    provider = createClientProvider(...(args as PoolConfig[]))
  }

  const mw: PoolMiddleware = function* PoolMiddleware(operation, ctx, next) {
    // FIXME this won't work, next is an operation builder
    if (isStart(operation)) return provider(ctx, () => next(operation))

    if (isGetClient(operation)) return getClientFn(ctx, operation.name)

    return yield next(operation)
  }

  mw.end = provider.end

  return mw
}

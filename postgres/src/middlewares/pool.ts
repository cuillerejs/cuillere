import { isStart, Middleware } from "@cuillere/core";
import { PoolConfig, ClientProvider, createClientProvider, isClientProvider } from "../postgres";

interface PoolMiddleware extends Middleware {
  end(): Promise<void>
}

export function poolMiddleware(...args: [PoolConfig | ClientProvider, ...PoolConfig[]]): PoolMiddleware {
  let provider: ClientProvider
  if (isClientProvider(args[0])) {
    provider = args[0]
  } else {
    provider = createClientProvider(...(args as PoolConfig[]))
  }

  const mw: PoolMiddleware = next => async (operation, ctx) => {
    if (isStart(operation)) {
      return provider(ctx, () => next(operation))
    }

    return next(operation)
  }

  mw.end = provider.end

  return mw
}
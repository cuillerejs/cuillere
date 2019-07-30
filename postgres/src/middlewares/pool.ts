import { isStart, Middleware } from "@cuillere/core";
import { PoolConfig, createClientProvider } from "../postgres";

const END = Symbol('END')

interface End {
  [END]: true,
}

export function end(): End {
  return { [END]: true }
}

function isEnd(operation: any): operation is End {
  return operation && operation[END]
}

export function poolMiddleware(...poolConfigs: PoolConfig[]): Middleware {
  const pool = createClientProvider(...poolConfigs)

  return next => async (operation, ctx) => {
    if (isStart(operation)) {
      return pool(ctx, () => next(operation))
    }

    if (isEnd(operation)) {
      return pool.end()
    }

    return next(operation)
  }
}
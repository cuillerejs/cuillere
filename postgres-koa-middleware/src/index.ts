import type { Middleware } from 'koa'
import { ClientManagerOptions, getClientManager } from '@cuillere/postgres'

export interface PostgresKoaMiddlewareOptions extends ClientManagerOptions {
  contextKey?: string
}

export function PostgresKoaMiddleware(options: PostgresKoaMiddlewareOptions): Middleware {
  const contextKey = options.contextKey ?? 'cuillere'
  return async (ctx, next) => {
    try {
      await getClientManager(options).execute(ctx[contextKey] = {}, next)
    } catch (e) {
      // Avoids unhandled promise rejection
    }
  }
}

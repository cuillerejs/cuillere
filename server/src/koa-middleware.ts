import type { Middleware, ParameterizedContext, DefaultState, DefaultContext } from 'koa'

import { AsyncTaskExecutorOptions } from './task-executor'

export type KoaMiddlewareArgs = [ParameterizedContext<DefaultState, DefaultContext>]

export function koaMiddleware(options: AsyncTaskExecutorOptions<KoaMiddlewareArgs>): Middleware {
  return async (ctx, next) => {
    try {
      await options.taskManager(ctx).execute(next, options.context(ctx))
    } catch (e) {
      // Avoids unhandled promise rejection
    }
  }
}

import type { Middleware, ParameterizedContext, DefaultState, DefaultContext } from 'koa'

import { AsyncTaskManager } from './task-manager'

export interface KoaMiddlewareOptions {
  context(ctx: ParameterizedContext<DefaultState, DefaultContext>): any
  taskManager(ctx: ParameterizedContext<DefaultState, DefaultContext>): AsyncTaskManager
}

export function KoaMiddleware(options: KoaMiddlewareOptions): Middleware {
  return async (ctx, next) => {
    try {
      await options.taskManager(ctx).execute(options.context(ctx), next)
    } catch (e) {
      // Avoids unhandled promise rejection
    }
  }
}

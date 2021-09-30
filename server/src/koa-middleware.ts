import type { Middleware, ParameterizedContext, DefaultState, DefaultContext } from 'koa'
import { AsyncTaskExecutorOptions } from '@cuillere/server-plugin'

export function koaMiddleware(options: AsyncTaskExecutorOptions<[ParameterizedContext<DefaultState, DefaultContext>]>): Middleware {
  return async (ctx, next) => {
    const taskManager = options.taskManager(ctx)
    if (taskManager == null) return next()

    try {
      await taskManager.execute(next, options.context(ctx))
    } catch (e) {
      // Avoids unhandled promise rejection
    }
  }
}

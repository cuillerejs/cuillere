import { Plugin } from '@cuillere/core'

import { AsyncTaskManager, GetTaskManager } from './task-manager'

export interface TaskExecutorOptions<T extends AsyncTaskManager, Args extends any[] = any[]> {
  context(...args: Args): any
  taskManager: GetTaskManager<T, Args>
}

export type AsyncTaskExecutorOptions<Args extends any[]> = TaskExecutorOptions<AsyncTaskManager, Args>

export function taskExecutorPlugin(options: AsyncTaskExecutorOptions<[any]>): Plugin {
  return {
    namespace: '@cuillere/task-executor',
    async wrap(next, ctx) {
      const taskManager = options.taskManager(ctx)

      if (!taskManager) return next()

      return taskManager.execute(next(), options.context?.(ctx) ?? ctx)
    },
    handlers: {},
  }
}

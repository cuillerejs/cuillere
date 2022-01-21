import { Plugin, delegate, next } from '@cuillere/core'

import { AsyncTaskManager, GeneratorTaskManager, GetTaskManager } from './task-manager'

export interface TaskExecutorOptions<T extends AsyncTaskManager | GeneratorTaskManager, Args extends any[] = any[]> {
  context(...args: Args): any
  taskManager: GetTaskManager<T, Args>
}

export type AsyncTaskExecutorOptions<Args extends any[]> = TaskExecutorOptions<AsyncTaskManager, Args>

export type GeneratorTaskExecutorOptions<Args extends any[]> = TaskExecutorOptions<GeneratorTaskManager, Args>

export function taskExecutorPlugin(options: GeneratorTaskExecutorOptions<[any]>): Plugin {
  return {
    handlers: {
      async* '@cuillere/core/start'(_, ctx) {
        const taskManager = options.taskManager(ctx)

        if (!taskManager) yield delegate()

        return yield* taskManager.execute(next(), options.context?.(ctx) ?? ctx)
      },
    },
  }
}

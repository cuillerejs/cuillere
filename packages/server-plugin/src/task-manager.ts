import { Plugin } from '@cuillere/core'

class BaseTaskManager {
  private listeners: TaskListener[]

  constructor(...listeners: TaskListener[]) {
    this.listeners = listeners
  }

  async initialize(ctx: any) {
    await Promise.all(this.listeners.map(listener => listener.initialize?.(ctx)))
  }

  async preComplete(result: any) {
    for (const listener of this.listeners) {
      await listener.preComplete?.(result)
    }
  }

  async complete(result: any) {
    const results = await Promise.allSettled(this.listeners.map(listener => listener.complete?.(result)))
    if (someRejected(results)) throw addErrorCauses(new Error('Task completion failed'), results)
  }

  async error(error: any) {
    const results = await Promise.allSettled(this.listeners.map(listener => listener.error?.(error)))
    if (someRejected(results)) throw addErrorCauses(new Error('Task error handling failed'), results)
  }

  async finalize(error: any) {
    const results = await Promise.allSettled(this.listeners.map(listener => listener.finalize?.(error)))
    if (someRejected(results)) throw addErrorCauses(new Error('Task finalization failed'), results)
  }
}

export class AsyncTaskManager extends BaseTaskManager {
  public async execute(task: () => Promise<any>, ctx: any) {
    let error: any

    try {
      await this.initialize(ctx)

      const result = await task()

      await this.preComplete(result)
      await this.complete(result)

      return result
    } catch (e) {
      await this.error(error = e)
      throw e
    } finally {
      await this.finalize(error)
    }
  }
}

export class SyncTaskManager extends BaseTaskManager {
  public async done(hasError: boolean) {
    let thrown = false
    try {
      if (hasError) {
        await this.error(hasError)
      } else {
        await this.preComplete(undefined)
        await this.complete(undefined)
      }
    } catch (error) {
      thrown = true
      await this.error(error)
      throw error
    } finally {
      await this.finalize(hasError || thrown)
    }
  }
}

export interface TaskListener {
  initialize?(ctx: any): void | Promise<void>
  preComplete?(result: any): void | Promise<void>
  complete?(result: any): void | Promise<void>
  error?(error: any): void | Promise<void>
  finalize?(error: any): void | Promise<void>
}

function someRejected(results: PromiseSettledResult<any>[]) {
  return results.some(isRejected)
}

function addErrorCauses(e: Error, results: PromiseSettledResult<any>[]) {
  e.cause = results
    .filter(isRejected)
    .map(({ reason }) => reason)
  return e
}

function isRejected(result: PromiseSettledResult<any>): result is PromiseRejectedResult {
  return result.status === 'rejected'
}

export function taskManagerPlugin(...listeners: TaskListener[]): Plugin {
  const taskManager = new AsyncTaskManager(...listeners)

  return {
    namespace: '@cuillere/task-manager',
    wrap(next, ctx) {
      return taskManager.execute(next(), ctx)
    },
    handlers: {},
  }
}

export interface GetTaskManager<T extends AsyncTaskManager, Args extends any[]> {
  (...args: Args): T
}
export type GetAsyncTaskManager<Args extends any[]> = GetTaskManager<AsyncTaskManager, Args>

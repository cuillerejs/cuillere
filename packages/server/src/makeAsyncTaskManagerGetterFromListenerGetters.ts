import { AsyncTaskManager, GetAsyncTaskManager, GetTaskListener, TaskListener } from '@cuillere/server-plugin'

export function makeAsyncTaskManagerGetterFromListenerGetters<Args extends any[]>(listenerGetters: GetTaskListener<Args>[]): GetAsyncTaskManager<Args> {
  return (...args) => {
    const listeners = listenerGetters
      .map(listenerGetter => listenerGetter(...args))
      .filter((listener): listener is TaskListener => listener != null)
    if (listeners.length === 0) return
    return new AsyncTaskManager(...listeners)
  }
}

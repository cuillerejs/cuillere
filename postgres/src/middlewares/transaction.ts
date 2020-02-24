import { Middleware, isStart, delegate, next } from '@cuillere/core'

export const transactionMiddleware = (config: { prepared?: boolean }): Middleware =>
  function* transactionMiddleware(operation) {
    if (!isStart(operation)) yield delegate(operation)

    setupTransactionManager(ctx)

    if (isGetClient(operation)) {
      const client = yield next(operation)

      if (!isTransactionStarted(client)) {
        yield query('BEGIN', { name: operation.name })
      }

      return client
    }

    try {
      yield next(operation)
      commit()
    } catch (err) {
      console.error(err)
      rollback()
    } finally {
      release()
    }
  }

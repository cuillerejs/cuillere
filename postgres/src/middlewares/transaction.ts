import { Middleware, isStart } from '@cuillere/core'
import { createTransactionManager } from '../postgres'

export const transactionMiddleware = (config: { prepared?: boolean }): Middleware => {
  const executor = createTransactionManager(config)

  return function* transactionMiddleware(operation, ctx, next) {
    if (isStart(operation)) {
      // FIXME this won't work, next is an operation builder...
      return executor(ctx, () => next(operation))
    }

    return yield next(operation)
  }
}

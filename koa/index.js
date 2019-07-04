import { makeRunner, call } from '@cuillere/core'

export const makeRequestHandlerFactory = (...middlewares) => {
  const run = makeRunner(...middlewares)

  return operation => (ctx, ...args) => run(ctx)(call(operation, ...args))
}
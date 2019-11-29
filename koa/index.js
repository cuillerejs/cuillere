import cuillere from '@cuillere/core'

export const makeRequestHandlerFactory = (...middlewares) => {
  const cllr = cuillere(...middlewares)

  return operation => (ctx, ...args) => cllr.ctx(ctx).execute(operation, ...args)
}

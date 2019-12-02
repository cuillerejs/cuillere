import cuillere from '@cuillere/core'

export const makeRequestHandlerFactory = (...middlewares) => {
  const cllr = cuillere(...middlewares)

  return fn => (ctx, ...args) => cllr.ctx(ctx).call(fn, ...args)
}

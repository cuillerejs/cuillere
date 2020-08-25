import cuillere from '@cuillere/core'

export const makeRequestHandlerFactory = (...plugins) => {
  const cllr = cuillere(...plugins)

  return fn => (ctx, ...args) => cllr.ctx(ctx).call(fn, ...args)
}

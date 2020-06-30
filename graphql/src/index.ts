import { Cuillere, isGenerator } from '@cuillere/core'

interface Resolver {
  (obj: object, args: object, ctx: object, info: object): any
}

export const makeResolverFactory = (cllr: Cuillere) => (fn: Resolver): Resolver =>
  (obj, args, ctx: CuillereContext, info) => {
    const res = fn(obj, args, ctx, info)
    if (!isGenerator(res)) return res
    // Copy function name on generator for stacktrace
    res['name'] = fn.name // eslint-disable-line dot-notation
    return (ctx.cuillere ?? cllr.ctx(ctx)).start(res as any)
  }

export const makeResolversTreeFactory = (cllr: Cuillere) => {
  const fnToResolver = makeResolverFactory(cllr)

  const treeToResolversTree = (tree: object) => {
    const resolvers = {}
    Object.entries(tree).forEach(([key, value]) => {
      resolvers[key] = typeof value === 'function' ? fnToResolver(value) : treeToResolversTree(value)
    })
    return resolvers
  }

  return treeToResolversTree
}

interface CuillereContext {
  cuillere: Cuillere
}

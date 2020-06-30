import { Cuillere, isGenerator } from '@cuillere/core'

interface Resolver {
  (obj: any, args: any, ctx: any, info: any): any
}

export const makeResolverFactory = (cllr: Cuillere) => (fn: Resolver): Resolver =>
  (obj, args, ctx: CuillereContext, info) => {
    const res = fn(obj, args, ctx, info)
    if (!res || !isGenerator(res)) return res
    // Copy function name on generator for stacktrace
    res['name'] = fn.name // eslint-disable-line dot-notation
    return (ctx.cuillere ?? cllr.ctx(ctx)).start(res as any)
  }

export const makeResolversTreeFactory = (cllr: Cuillere) => {
  const fnToResolver = makeResolverFactory(cllr)

  const treeToResolversTree = (tree: Record<string, any>) => {
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

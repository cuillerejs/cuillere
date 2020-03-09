import { Cuillere, isGenerator } from '@cuillere/core'

interface Resolver {
  (obj: object, args: object, ctx: object, info: object): any
}

export const makeResolverFactory = (cllr: Cuillere) => (fn: Resolver): Resolver =>
  (obj, args, ctx: CuillereContext, info) => {
    const res = fn(obj, args, ctx, info)
    return isGenerator(res) ? (ctx.cuillere ?? cllr.ctx(ctx)).execute(res) : res
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

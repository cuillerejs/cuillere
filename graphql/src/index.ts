import { Cuillere, isGenerator } from '@cuillere/core'
export * from './apollo-middleware-plugin'

export const makeResolverFactory = (cllr: Cuillere) => fn => (obj, args, ctx, info) => {
  const res = fn(obj, args, ctx, info)
  return isGenerator(res) ? cllr.ctx(ctx).execute(res) : res
}

export const makeResolversTreeFactory = (cllr: Cuillere) => {
  const fnToResolver = makeResolverFactory(cllr)

  const treeToResolversTree = tree => {
    const resolvers = {}
    Object.entries(tree).forEach(([key, value]) => {
      resolvers[key] = typeof value === 'function' ? fnToResolver(value) : treeToResolversTree(value)
    })
    return resolvers
  }

  return treeToResolversTree
}

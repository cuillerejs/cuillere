import { call } from '@cuillere/core'

const isGenerator = value => value.next && value.throw

export const makeResolverFactory = run => fn => (obj, args, ctx, info) => {
  const res = fn(obj, args, ctx, info)
  return isGenerator(res) ? run(ctx)(call(res)) : res
}

export const makeResolversTreeFactory = run => {
  const fnToResolver = makeResolverFactory(run)

  const treeToResolversTree = tree => {
    const resolvers = {}
    Object.entries(tree).forEach(([key, value]) => {
      resolvers[key] = typeof value === 'function' ? fnToResolver(value) : treeToResolversTree(value)
    })
    return resolvers
  }

  return treeToResolversTree
}

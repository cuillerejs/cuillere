import { call } from '@cuillere/core'

export const makeResolverFactory = run => genFn => (obj, args, ctx, info) => run(ctx)(call(genFn, obj, args, ctx, info))

export const makeResolverTreeFactory = run => {
  const genFnToResolver = makeResolverFactory(run)

  const genTreeToResolvers = genResolvers => {
    const resolvers = {}
    Object.entries(genResolvers).forEach(([key, value]) => {
      resolvers[key] = typeof value === 'function' ? genFnToResolver(value) : genTreeToResolvers(value)
    })
    return resolvers
  }

  return genTreeToResolvers
}

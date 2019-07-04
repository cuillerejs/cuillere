import { call } from '@cuillere/core'

export const makeResolverFactory = run => genFn => (obj, args, ctx, info) => run(ctx)(call(genFn, obj, args, ctx, info))

// FIXME a makeResolvers which takes a tree of generator functions and returns a tree of resolvers

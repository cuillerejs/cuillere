import { Cuillere, isGenerator } from '@cuillere/core'
import type { GraphQLFieldResolver } from 'graphql'

// FIXME manage arrays of resolvers... and other types of resolvers ?

export const makeResolversTreeFactory = (cllr: Cuillere, options?: GraphQLOptions) => {
  const contextKey = options?.contextKey ?? 'cuillere'
  const getContext = (context: any) => context[contextKey]

  const fnToResolver = makeResolverFactory(cllr, getContext)

  const treeToResolversTree = (tree: Record<string, any>) => Object.fromEntries(
    Object.entries(tree).map(([key, value]) => [
      key,
      typeof value === 'function' ? fnToResolver(value) : treeToResolversTree(value),
    ]),
  )

  return treeToResolversTree
}

const makeResolverFactory = (cllr: Cuillere, getContext: (ctx: any) => any) => (fn: Resolver): Resolver =>
  (obj, args, ctx, info) => {
    const res = fn(obj, args, ctx, info)

    if (!res || !isGenerator(res)) return res

    // Copy function name on generator for stacktrace
    res['name'] = fn.name // eslint-disable-line dot-notation

    return cllr.ctx(getContext(ctx)).start(res)
  }

export interface GraphQLOptions {
  contextKey?: string
}

type Resolver = GraphQLFieldResolver<any, any>

import { Cuillere, isGenerator } from '@cuillere/core'
import { IEnumResolver, IFieldResolver, IResolverObject, IResolverOptions, IResolvers } from 'apollo-server-koa'
import { isScalarType, GraphQLScalarType, GraphQLFieldResolver } from 'graphql'

type GqlResolvers = IResolvers<any, any> | IResolvers<any, any>[]
type ResolverEntry = (() => any) | IResolverObject<any, any> | IResolverOptions<any, any> | GraphQLScalarType | IEnumResolver

export const makeResolversFactory = (cllr: Cuillere, options?: GraphQLOptions): ((GqlResolvers) => IResolvers<any, any> | IResolvers<any, any>[]) => {
  const contextKey = options?.contextKey ?? 'cuillere'
  const getContext = (context: any) => context[contextKey]

  const resolverFactory = makeResolverFactory(cllr, getContext)

  return applyToResolvers(resolverFactory)
}

function applyToResolvers(fn: (Resolver) => Resolver): (resolvers: IResolvers<any, any>) => IResolvers<any, any>;
function applyToResolvers(fn: (Resolver) => Resolver): (resolvers: IResolvers<any, any>[]) => IResolvers<any, any>[];
function applyToResolvers(fn: (Resolver) => Resolver): (resolvers: GqlResolvers) => GqlResolvers {
  return (resolvers) => {
    if (isResolverArray(resolvers)) {
      return resolvers.map(resolver => applyToResolvers(fn)(resolver))
    }

    const entries = Object.entries(resolvers).map(([key, value]): [string, ResolverEntry] => {
      if (isScalarType(value) || isResolverOptions(value) || isEnumResolver(value)) return [key, value]
      if (typeof value === 'function') return [key, fn(value) as () => any]

      return [key, applyToResolverObject(fn)(value)]
    })

    return Object.fromEntries(entries)
  }
}

type ResolverObjectEntry = IFieldResolver<any, any, any> | IResolverOptions<any, any> | IResolverObject<any, any>
function applyToResolverObject(fn: (Resolver) => Resolver): (resolver: IResolverObject<any, any>) => IResolverObject<any, any> {
  return (resolverObject) => {
    const entries = Object.entries(resolverObject).map(([key, value]): [string, ResolverObjectEntry] => {
      if (isResolverOptions(value)) return [key, value]
      if (typeof value === 'function') return [key, fn(value) as () => any]

      return [key, applyToResolverObject(fn)(value)]
    })

    return Object.fromEntries(entries)
  }
}

const makeResolverFactory = (cllr: Cuillere, getContext: (ctx: any) => any) => (fn: Resolver): Resolver =>
  (obj, args, ctx, info) => {
    const res = fn(obj, args, ctx, info)

    if (!res || !isGenerator(res)) return res

    // Copy function name on generator for stacktrace
    res.name = fn.name

    return cllr.ctx(getContext(ctx)).start(res)
  }

export interface GraphQLOptions {
  contextKey?: string
}

type Resolver = GraphQLFieldResolver<any, any>

function isResolverArray(resolvers: IResolvers<any, any> | IResolvers<any, any>[]): resolvers is IResolvers<any, any>[] {
  return Array.isArray(resolvers)
}

function isResolverOptions(value: any): value is IResolverOptions {
  return 'resolve' in value
}

function isEnumResolver(value: any): value is IEnumResolver {
  if (typeof value !== 'object') return false
  return Object.values(value).every(v => typeof v === 'string' || typeof v === 'number')
}

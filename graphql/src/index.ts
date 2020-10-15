import { Cuillere, isGenerator } from '@cuillere/core'
import { IEnumResolver, IResolverObject, IResolverOptions, IResolvers } from 'apollo-server-koa'
import { isScalarType, GraphQLFieldResolver } from 'graphql'

type OneOrMany<T> = T | T[]

export interface GraphQLOptions {
  contextKey?: string
}

export const makeResolversFactory = (cllr: Cuillere, options?: GraphQLOptions): ((r: OneOrMany<IResolvers>) => OneOrMany<IResolvers>) => {
  const contextKey = options?.contextKey ?? 'cuillere'
  const getContext = (context: any) => context[contextKey]

  const resolverFactory = makeResolverFactory(cllr, getContext)

  return applyToResolvers(resolverFactory)
}

function applyToResolvers(fn: FieldResolverWrapper): (resolvers: IResolvers) => IResolvers;
function applyToResolvers(fn: FieldResolverWrapper): (resolvers: IResolvers[]) => IResolvers[];
function applyToResolvers(fn: FieldResolverWrapper): (resolvers: OneOrMany<IResolvers>) => OneOrMany<IResolvers> {
  return (resolvers: IResolvers | IResolvers[]) => {
    if (isResolverArray(resolvers)) {
      return resolvers.map(resolver => applyToResolvers(fn)(resolver))
    }

    // Usage of .reduce() to keep type inference
    return Object.entries(resolvers).reduce((resolver: IResolvers, [key, value]) => {
      if (isScalarType(value) || isResolverOptions(value) || isEnumResolver(value)) resolver[key] = value
      else if (typeof value === 'function') resolver[key] = fn(value) as () => any
      else resolver[key] = applyToObject(fn)(value)

      return resolver
    }, {})
  }
}

function applyToObject(fn: FieldResolverWrapper): (resolvers: IResolverObject) => IResolverObject {
  return resolverObject => Object.entries(resolverObject).reduce((resolver: IResolverObject, [key, value]) => {
    if (isResolverOptions(value)) resolver[key] = value
    else if (typeof value === 'function') resolver[key] = fn(value) as () => any
    else resolver[key] = applyToObject(fn)(value)

    return resolver
  }, {})
}

function makeResolverFactory(cllr: Cuillere, getContext: (ctx: any) => any): FieldResolverWrapper {
  return (fn: GraphQLFieldResolver<any, any>) => (obj, args, ctx, info) => {
    const res = fn(obj, args, ctx, info)

    if (!res || !isGenerator(res)) return res

    // Copy function name on generator for stacktrace
    res.name = fn.name

    return cllr.ctx(getContext(ctx)).start(res)
  }
}

type FieldResolverWrapper = (original: GraphQLFieldResolver<any, any>) => GraphQLFieldResolver<any, any>

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

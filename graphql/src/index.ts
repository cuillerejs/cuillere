import { Cuillere, isGenerator } from '@cuillere/core'
import type { IEnumResolver, IResolverObject, IResolverOptions, IResolvers } from 'apollo-server-koa'
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

    const wrappedResolvers: IResolvers = {}

    for (const [key, value] of Object.entries(resolvers)) {
      if (isScalarType(value) || isEnumResolver(value)) wrappedResolvers[key] = value
      else if (isResolverOptions(value)) wrappedResolvers[key] = mapResolverOption(fn, value)
      else if (typeof value === 'function') wrappedResolvers[key] = fn(value) as () => any
      else wrappedResolvers[key] = applyToObject(fn)(value)
    }

    return wrappedResolvers
  }
}

function applyToObject(fn: FieldResolverWrapper): (resolvers: IResolverObject) => IResolverObject {
  return (resolverObject) => {
    const wrappedResolverObject: IResolverObject = {}

    for (const [key, value] of Object.entries(resolverObject)) {
      if (isResolverOptions(value)) wrappedResolverObject[key] = mapResolverOption(fn, value)
      else if (typeof value === 'function') wrappedResolverObject[key] = fn(value) as () => any
      else wrappedResolverObject[key] = applyToObject(fn)(value)
    }

    return wrappedResolverObject
  }
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

function isResolverArray(resolvers: OneOrMany<IResolvers>): resolvers is IResolvers[] {
  return Array.isArray(resolvers)
}

function isResolverOptions(value: any): value is IResolverOptions {
  return '__resolveType' in value
}

function mapResolverOption(fn: FieldResolverWrapper, value: IResolverOptions) {
  return {
    ...value,
    resolve: value.resolve ? fn(value.resolve) : value.resolve,
    subscribe: value.subscribe ? fn(value.subscribe) : value.subscribe,
  }
}

function isEnumResolver(value: any): value is IEnumResolver {
  if (typeof value !== 'object') return false
  return Object.values(value).every(v => typeof v === 'string' || typeof v === 'number')
}

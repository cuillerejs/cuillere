import { Cuillere, isGeneratorFunction } from '@cuillere/core'
import type { IEnumResolver, IResolverObject, IResolverOptions, IResolvers } from 'graphql-tools'
import { isScalarType, GraphQLFieldResolver } from 'graphql'
import { defaultContextKey } from './context'

type OneOrMany<T> = T | T[]

export interface CuillereHolder {
  cllr?: Cuillere
  contextKey?: string
}

export function wrapFieldResolvers(resolvers: OneOrMany<IResolvers>, holder: CuillereHolder) {
  const wrapper = getFieldResolverWrapper(holder)

  return applyToResolvers(wrapper, resolvers)
}

function applyToResolvers(fn: FieldResolverWrapper, resolvers: IResolvers): IResolvers;
function applyToResolvers(fn: FieldResolverWrapper, resolvers: IResolvers[]): IResolvers[];
function applyToResolvers(fn: FieldResolverWrapper, resolvers: OneOrMany<IResolvers>): OneOrMany<IResolvers>;
function applyToResolvers(fn: FieldResolverWrapper, resolvers: OneOrMany<IResolvers>): OneOrMany<IResolvers> {
  if (isResolverArray(resolvers)) {
    return resolvers.map(resolver => applyToResolvers(fn, resolver))
  }

  const wrappedResolvers: IResolvers = {}

  for (const [key, value] of Object.entries(resolvers)) {
    if (isScalarType(value) || isEnumResolver(value)) wrappedResolvers[key] = value
    else if (typeof value === 'function') wrappedResolvers[key] = isGeneratorFunction(value) ? fn(value) as () => any : value
    else if (isResolverOptions(value)) wrappedResolvers[key] = mapResolverOption(fn, value)
    else wrappedResolvers[key] = applyToObject(fn, value)
  }

  return wrappedResolvers
}

function applyToObject(fn: FieldResolverWrapper, resolverObject: IResolverObject): IResolverObject {
  const wrappedResolverObject: IResolverObject = {}

  for (const [key, value] of Object.entries(resolverObject)) {
    if (typeof value === 'function') wrappedResolverObject[key] = isGeneratorFunction(value) ? fn(value) as () => any : value
    else if (isResolverOptions(value)) wrappedResolverObject[key] = mapResolverOption(fn, value)
    else wrappedResolverObject[key] = applyToObject(fn, value)
  }

  return wrappedResolverObject
}

function getFieldResolverWrapper(holder: CuillereHolder): FieldResolverWrapper {
  const cllr = (context: any) => {
    if (!holder.cllr) throw Error('Cuillere plugins are not set. Make sure to use CuillereServer and not ApolloServer.')
    return holder.cllr.ctx(context[holder?.contextKey ?? defaultContextKey])
  }

  return (fn: GraphQLFieldResolver<any, any>) => async (obj, args, ctx, info) => cllr(ctx).call(fn, obj, args, ctx, info)
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

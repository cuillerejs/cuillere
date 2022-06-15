import { cuillere, isGeneratorFunction, Operation, Plugin } from '@cuillere/core'
import { Plugin as EnvelopPlugin } from '@envelop/core'

const addPluginsContextField = Symbol('addCuillerePlugins')

export type CuillereEnvelopPluginOptions = {
  plugins?: Plugin[]
  instanceContextField?: string
  contextContextField?: string
}

export function useCuillere({
  plugins: basePlugins = [],
  instanceContextField = 'cuillere',
  contextContextField = 'cuillereContext',
}: CuillereEnvelopPluginOptions = {}): EnvelopPlugin {
  return {
    onEnveloped({ context, extendContext }) {
      let plugins = [contextPlugin, ...basePlugins]
      const ctx = context[contextContextField] ?? {}
      extendContext({
        [instanceContextField]: cuillere(...plugins).ctx(ctx),
        [contextContextField]: ctx,
        [addPluginsContextField]: (newPlugins: Plugin[]) => {
          plugins = [...plugins, ...newPlugins]
          return {
            [instanceContextField]: cuillere(...plugins).ctx(ctx),
          }
        },
      })
    },
    onExecute({ args }) {
      args.contextValue[contextContextField].graphQLContext = args.contextValue
    },
    onSubscribe({ args }) {
      args.contextValue[contextContextField].graphQLContext = args.contextValue
    },
    onResolverCalled({ context, resolverFn, replaceResolverFn }) {
      if (!isGeneratorFunction(resolverFn)) return
      replaceResolverFn((obj, args, ctx, info) => context[instanceContextField].call(resolverFn, obj, args, ctx, info))
    },
  }
}

export function useCuillerePlugins(...plugins: Plugin[]): EnvelopPlugin<{
  [addPluginsContextField]?: (plugins: Plugin[]) => any
}> {
  return {
    onEnveloped({ context, extendContext }) {
      if (!(addPluginsContextField in context)) throw new Error('useCuillerePlugins() cannot be used before useCuillere()')
      extendContext(context[addPluginsContextField](plugins))
    },
  }
}

const namespace = '@envelop/context'

export interface GetContextOperation extends Operation {
  field?: string
}

export function getContext(field?: string): GetContextOperation {
  return { kind: `${namespace}/get`, field }
}

type ContextOperations = {
  get: GetContextOperation
}

const contextPlugin: Plugin<ContextOperations> = {
  namespace,

  handlers: {
    * get({ field }, { graphQLContext }) {
      if (!graphQLContext) throw new Error('getContext() must not be used outside of resolvers')
      if (!field) return graphQLContext
      return graphQLContext[field]
    },
  },
}

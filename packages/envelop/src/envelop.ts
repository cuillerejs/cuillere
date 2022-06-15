import { Cuillere, cuillere, isGeneratorFunction, Operation, Plugin } from '@cuillere/core'
import { Plugin as EnvelopPlugin } from '@envelop/core'

const addPluginsField = Symbol('addPlugins')

type PluginsAdder = EnvelopPlugin & {
  [addPluginsField](plugins: Plugin[]): void
}

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
  let plugins: Plugin[] = [contextPlugin]
  let cllr: Cuillere

  function addPlugins(newPlugins: Plugin[]) {
    plugins = [...plugins, ...newPlugins]
    cllr = cuillere(...plugins)
  }

  addPlugins(basePlugins)

  const plugin: EnvelopPlugin = {
    onEnveloped({ context, extendContext }) {
      const ctx = context[contextContextField] ?? {}
      extendContext({ [instanceContextField]: cllr.ctx(ctx), [contextContextField]: ctx })
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

  plugin[addPluginsField] = addPlugins

  return plugin
}

export function useCuillerePlugins(...plugins: Plugin[]): EnvelopPlugin {
  return {
    onPluginInit({ plugins: envelopPlugins }) {
      const { [addPluginsField]: addPlugins } = envelopPlugins.find((plugin): plugin is PluginsAdder => addPluginsField in plugin)
      addPlugins(plugins)
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

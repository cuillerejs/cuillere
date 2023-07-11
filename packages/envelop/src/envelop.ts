import { mapSchema, MapperKind } from '@graphql-tools/utils'
import { type Cuillere, cuillere, isGeneratorFunction, Plugin } from '@cuillere/core'
import type { Plugin as EnvelopPlugin } from '@envelop/core'
import { contextPlugin } from './context-plugin'

export type CuillereEnvelopPluginOptions = {
  plugins?: Plugin[]
  instanceContextField?: string
  contextContextField?: string
}

export function useCuillere({
  plugins: basePlugins = [],
  instanceContextField = '_cuillere',
  contextContextField = '_cuillereContext',
}: CuillereEnvelopPluginOptions = {}): PluginsAdder {
  let plugins: Plugin[] = [contextPlugin]
  let cllr: Cuillere

  const plugin = {
    [addPlugins](newPlugins: Plugin[]) {
      plugins = [...plugins, ...newPlugins]
      cllr = cuillere(...plugins)
    },
    onSchemaChange({ schema, replaceSchema }) {
      replaceSchema(mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
          const { resolve } = fieldConfig
          if (!isGeneratorFunction(fieldConfig.resolve)) return fieldConfig
          return {
            ...fieldConfig,
            resolve: (obj, args, ctx, info) => ctx[instanceContextField].run(resolve(obj, args, ctx, info)),
          }
        },
      }))
    },
    onEnveloped({ context, extendContext }) {
      const ctx = context[contextContextField] ?? {}
      extendContext({ [instanceContextField]: cllr.context(ctx), [contextContextField]: ctx })
    },
    onExecute({ args }) {
      args.contextValue[contextContextField].graphQLContext = args.contextValue
    },
    onSubscribe({ args }) {
      args.contextValue[contextContextField].graphQLContext = args.contextValue
    },
  }

  plugin[addPlugins](basePlugins)

  return plugin
}

export function useCuillerePlugins(...plugins: Plugin[]): EnvelopPlugin {
  return {
    onPluginInit({ plugins: envelopPlugins }) {
      const pluginsAdder = envelopPlugins.find((plugin): plugin is PluginsAdder => plugin?.[addPlugins] != null)
      if (pluginsAdder == undefined) throw new Error('useCuillerePlugins cannot be used before useCuillere')

      pluginsAdder[addPlugins](plugins)
    },
  }
}

const addPlugins = Symbol('addPlugins')

type PluginsAdder = EnvelopPlugin & {
  [addPlugins](plugins: Plugin[]): void
}

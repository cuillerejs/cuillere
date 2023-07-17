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
    [addPluginsSymbol](newPlugins: Plugin[]) {
      plugins = [...plugins, ...newPlugins]
      cllr = cuillere(...plugins)
      return { instanceContextField, contextContextField, plugins }
    },
    getConfig() {
      return { instanceContextField, contextContextField, plugins }
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
    onEnveloped({ context }) {
      const ctx = context[contextContextField] ?? {}
      // Waiting for fix from Envelop, don't use extendContext
      // extendContext doesn't mutate execution args context
      context[contextContextField] = ctx
      context[instanceContextField] = cllr.context(ctx)
    },
    onExecute({ args }) {
      args.contextValue[contextContextField].graphQLContext = args.contextValue
    },
    onSubscribe({ args }) {
      args.contextValue[contextContextField].graphQLContext = args.contextValue
    },
  }

  plugin[addPluginsSymbol](basePlugins)

  return plugin
}

export function useCuillerePlugins(...plugins: Plugin[]): EnvelopPlugin {
  return {
    onPluginInit({ plugins: envelopPlugins }) {
      const pluginsAdder = envelopPlugins.find((plugin): plugin is PluginsAdder => plugin?.[addPluginsSymbol] != null)
      if (pluginsAdder == undefined) throw new Error('useCuillerePlugins cannot be used before useCuillere')

      pluginsAdder[addPluginsSymbol](plugins)
    },
  }
}

const addPluginsSymbol = Symbol('addPlugins')

type PluginsAdder = EnvelopPlugin & {
  [addPluginsSymbol](plugins: Plugin[]): CuillereEnvelopPluginOptions
  getConfig(): CuillereEnvelopPluginOptions
}

export function addPlugins(envelopPlugins: EnvelopPlugin[], cuillerePlugins: Plugin[]): CuillereEnvelopPluginOptions {
  const pluginsAdder = envelopPlugins.find((plugin): plugin is PluginsAdder => plugin?.[addPluginsSymbol] != null)
  if (pluginsAdder == undefined) throw new Error('useCuillere is missing in the envelop plugins or should be placed before other cuillere plugins')

  return pluginsAdder[addPluginsSymbol](cuillerePlugins)
}

export function getConfig(envelopPlugins: EnvelopPlugin[]): CuillereEnvelopPluginOptions {
  const pluginsAdder = envelopPlugins.find((plugin): plugin is PluginsAdder => plugin?.[addPluginsSymbol] != null)
  if (pluginsAdder == undefined) throw new Error('useCuillere is missing in the envelop plugins or should be placed before other cuillere plugins')
  return pluginsAdder.getConfig()
}

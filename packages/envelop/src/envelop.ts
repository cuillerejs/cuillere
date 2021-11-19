import { type Cuillere, type Plugin, cuillere, isGeneratorFunction } from '@cuillere/core'
import type { Plugin as EnvelopPlugin } from '@envelop/core'

export function useCuillere({ plugins: cllrPlugins = [], contextKey = 'cuillereContext', instanceKey = 'cuillere' }: { plugins?: Plugin[]; contextKey?: string; instanceKey?: string } = {}): CuillereCoreEnvelopPlugin {
  let cllr: Cuillere

  const plugin: CuillereCoreEnvelopPlugin = {
    get cuillere() {
      return cllr
    },
    get contextKey() {
      return contextKey
    },
    get instanceKey() {
      return instanceKey
    },
    onPluginInit({ plugins }) {
      const pluginsToRegister = plugins.flatMap(plugin => (isCuillerePlugin(plugin) && plugin.cuillere?.plugins) || [])
      cllr = cuillere(...cllrPlugins, ...pluginsToRegister)
    },
    onEnveloped({ extendContext, context }) {
      const ctx = context[contextKey] ?? {}
      extendContext({ [instanceKey]: cllr.ctx(ctx), [contextKey]: ctx })
    },
    onExecute({ args: { contextValue } }) {
      return {
        onResolverCalled({ resolverFn, replaceResolverFn }) {
          if (!isGeneratorFunction(resolverFn)) return
          replaceResolverFn((obj, args, ctx, info) => contextValue[instanceKey].call(resolverFn, obj, args, ctx, info))
        },
      }
    },
  }

  Object.defineProperty(plugin, CUILLERE_CORE_ENVELOP_PLUGIN, { enumerable: true, writable: false, value: true })

  return plugin
}

export interface CuillereCoreEnvelopPlugin extends EnvelopPlugin {
  cuillere: Cuillere
  contextKey: string
  instanceKey: string
}

export function isCuillereCoreEnvelopPlugin(plugin: EnvelopPlugin): plugin is CuillereCoreEnvelopPlugin {
  return CUILLERE_CORE_ENVELOP_PLUGIN in plugin
}

const CUILLERE_CORE_ENVELOP_PLUGIN = Symbol('CUILLERE_CORE_ENVELOP_PLUGIN')

export const IS_CUILLERE_PLUGIN = Symbol('IS_CUILLERE_PLUGIN')

export interface CuillereEnvelopPlugin extends EnvelopPlugin {
  [IS_CUILLERE_PLUGIN]: true
  cuillere?: { plugins: Plugin[] }
}

export function isCuillerePlugin(plugin: any): plugin is CuillereEnvelopPlugin {
  return plugin[IS_CUILLERE_PLUGIN]
}

export function ensurePlugin(plugins, addPlugin, predicate, factory) {
  let plugin = plugins.find(predicate)
  if (!plugin) {
    plugin = factory()
    addPlugin(plugin)
  }

  return plugin
}

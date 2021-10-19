import { Cuillere, Plugin, cuillere, isGeneratorFunction } from '@cuillere/core'
import { Plugin as EnvelopPlugin } from '@envelop/core'

export function useCuillere({ plugins = [], contextKey }: { plugins?: Plugin[]; contextKey?: string} = {}): CuillereEnvelopPlugin {
  const cllr = cuillere(...plugins)

  const plugin = {
    get cuillere() {
      return cllr
    },
    onEnveloped({ extendContext }) {
      extendContext({ [contextKey]: cllr.ctx({}) })
    },
    onExecute({ args: { contextValue } }) {
      console.log((contextValue as any).operation.operation) // guaranteed to be here as long as contextFactory is used

      return {
        onResolverCalled({ resolverFn, replaceResolverFn }) {
          if (!isGeneratorFunction(resolverFn)) return
          replaceResolverFn((obj, args, ctx, info) => contextValue[contextKey].call(resolverFn, obj, args, ctx, info))
        },
      }
    },
  }

  Object.defineProperty(plugin, CUILLERE_ENVELOP_PLUGIN, { enumerable: true, writable: false, value: true })

  return plugin
}

export interface CuillereEnvelopPlugin extends EnvelopPlugin {
  cuillere: Cuillere
}

export function isCuillereEnvelopPlugin(plugin: EnvelopPlugin): plugin is CuillereEnvelopPlugin {
  return CUILLERE_ENVELOP_PLUGIN in plugin
}

const CUILLERE_ENVELOP_PLUGIN = Symbol('CUILLERE_ENVELOP_PLUGIN')

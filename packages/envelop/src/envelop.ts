import { Plugin, cuillere, isGeneratorFunction } from '@cuillere/core'
import { Plugin as EnvelopPlugin } from '@envelop/core'

export function useCuillere({ plugins = [], contextKey = 'cuillere' }: { plugins?: Plugin[]; contextKey?: string} = {}): EnvelopPlugin {
  const cllr = cuillere(...plugins)

  return {
    onEnveloped({ extendContext }) {
      extendContext({ [contextKey]: cllr.ctx({}) })
    },
    onExecute({ args: { contextValue } }) {
      return {
        onResolverCalled({ resolverFn, replaceResolverFn }) {
          if (!isGeneratorFunction(resolverFn)) return
          replaceResolverFn(async (obj, args, ctx, info) => contextValue[contextKey].call(resolverFn, obj, args, ctx, info))
        },
      }
    },
  }
}

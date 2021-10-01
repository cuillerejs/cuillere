import { isGeneratorFunction } from '@cuillere/core'
import { Plugin } from '@envelop/core'

export function useCuillere(): Plugin {
  return {
    onExecute(execOptions) {
      return {
        onResolverCalled({ resolverFn }) {
          if (!isGeneratorFunction(resolverFn)) return
        },
      }
    },
  }
}

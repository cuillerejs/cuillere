import { delegate, OperationObject } from '@cuillere/core'
import type { ServerPlugin, ServerContext } from '@cuillere/server'

import { Crud } from './crud'
import { mergeCruds } from './mergeCruds'
import { getCrudProviders } from './provider'

export function crudServerPlugin(srvCtx: ServerContext): ServerPlugin {
  let crud: Crud

  return {
    async serverWillStart() {
      const providers = getCrudProviders(srvCtx)
      const cruds = await Promise.all(providers.map(provider => provider.build()))
      crud = mergeCruds(...cruds)
    },

    graphqlContext() {
      return { crud }
    },

    plugins: {
      handlers: {
        * '@cuillere/start'(operation: OperationObject, ctx: any) {
          if (crud != null) ctx.crud = crud
          yield delegate(operation)
        },
      },
    },
  }
}

import { delegate, OperationObject } from '@cuillere/core'
import type { ServerPlugin, ServerContext } from '@cuillere/server-plugin'

import { Crud } from './crud'
import { mergeCruds } from './mergeCruds'
import { promoteCrud } from './promoteCrud'
import { getCrudProviders } from './provider'

export function crudServerPlugin(srvCtx: ServerContext): ServerPlugin {
  const crudHolder: { crud?: Crud } = {}

  return {
    async serverWillStart() {
      const providers = getCrudProviders(srvCtx)
      const cruds = await Promise.all(providers.map(provider => provider.build()))
      crudHolder.crud = promoteCrud(mergeCruds(cruds))
    },

    graphqlContext: crudHolder,

    plugins: {
      handlers: {
        * '@cuillere/start'(operation: OperationObject, ctx: any) {
          if (crudHolder.crud != null) ctx.crud = crudHolder.crud
          yield delegate(operation)
        },
      },
    },
  }
}

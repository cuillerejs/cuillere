import { delegate, OperationObject } from '@cuillere/core'
import type { ServerPlugin, ServerContext } from '@cuillere/server-plugin'
import { getDatabaseProviders } from '@cuillere/server-plugin'

import { Crud } from './crud'
import { mergeCruds } from './mergeCruds'
import { promoteCrud } from './promoteCrud'

export function crudServerPlugin(srvCtx: ServerContext): ServerPlugin {
  const crudHolder: { crud?: Crud } = {}

  return {
    async serverWillStart() {
      const providers = getDatabaseProviders(srvCtx)
      const cruds = await Promise.all(providers.filter(isCrudCompatible).map(provider => provider.buildCrud()))
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

export interface CrudProvider {
  buildCrud(): Promise<Crud>
}

function isCrudCompatible(provider: any): provider is CrudProvider {
  return provider.buildCrud != null
}

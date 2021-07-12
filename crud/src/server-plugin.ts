import { all, call, delegate, OperationObject } from '@cuillere/core'
import type { ServerPlugin, ServerContext } from '@cuillere/server'

import { Crud } from './crud'
import { mergeCruds } from './mergeCruds'
import { getCrudProviders } from './provider'

export function crudServerPlugin(srvCtx: ServerContext): ServerPlugin {
  let crud: Crud

  return {
    * serverWillStart() {
      const providers = getCrudProviders(srvCtx)
      const cruds = yield all(providers.map(provider => call(provider.buildCrud)))
      crud = mergeCruds(cruds)
      return {} // FIXME fix the typing of serverWillStart
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

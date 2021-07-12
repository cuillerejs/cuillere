import { Generator } from '@cuillere/core'
import type { ServerContext } from '@cuillere/server'

import { Crud } from './crud'

export interface CrudProvider {
  buildCrud(): Generator<Crud>
}

const CRUD_PROVIDERS = Symbol('CRUD_PROVIDERS')

export function registerCrudProvider(srvCtx: ServerContext, name: string, provider: CrudProvider) {
  let providers: Map<string, CrudProvider>
  if (srvCtx.has(CRUD_PROVIDERS)) providers = srvCtx.get(CRUD_PROVIDERS)
  else srvCtx.set(CRUD_PROVIDERS, providers = new Map())
  providers.set(name, provider)
}

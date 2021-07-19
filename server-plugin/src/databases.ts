import { ServerContext } from './types'

const DATABASE_PROVIDERS = Symbol('DATABASE_PROVIDERS')

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DatabaseProvider {
  buildCrud
}

export function registerDatabaseProvider(srvCtx: ServerContext, name: string, provider: DatabaseProvider) {
  let providers: Map<string, any>
  if (srvCtx.has(DATABASE_PROVIDERS)) providers = srvCtx.get(DATABASE_PROVIDERS)
  else srvCtx.set(DATABASE_PROVIDERS, providers = new Map())
  providers.set(name, provider)
}

export function getDatabaseProviders(srvCtx: ServerContext): DatabaseProvider[] {
  const providers: Map<string, DatabaseProvider> = srvCtx.get(DATABASE_PROVIDERS)
  return Array.from(providers?.values() ?? [])
}

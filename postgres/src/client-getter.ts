import type { PoolClient } from 'pg'

const CLIENT_GETTER = Symbol('CLIENT_GETTER')

export function getClientGetter(ctx: any): ClientGetter {
  return ctx[CLIENT_GETTER]
}

export function setClientGetter(ctx: any, queryHandler: ClientGetter) {
  ctx[CLIENT_GETTER] = queryHandler
}

export interface ClientGetter {
  (name?: string): Promise<PoolClient>
}

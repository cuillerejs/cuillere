import type { PoolClient } from 'pg'

const CLIENT_GETTER = Symbol('CLIENT_GETTER')

export function getClientGetter(ctx: any): ClientGetter {
  return ctx[CLIENT_GETTER]
}

export function setClientGetter(ctx: any, clientGetter: ClientGetter) {
  ctx[CLIENT_GETTER] = clientGetter
}

export interface ClientGetter {
  (name?: string): Promise<PoolClient>
}

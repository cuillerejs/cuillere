import type { Connection } from 'mariadb'

const CONNECTION_GETTER = Symbol('CONNECTION_GETTER')

export function getConnectionGetter(ctx: any): ConnectionGetter {
  return ctx[CONNECTION_GETTER]
}

export function setConnectionGetter(ctx: any, clientGetter: ConnectionGetter) {
  ctx[CONNECTION_GETTER] = clientGetter
}

export interface ConnectionGetter {
  (name?: string): Promise<Connection>
}

import { Middleware } from '@cuillere/core'
import { QueryConfig as PgQueryConfig } from 'pg'
import { getClient } from '../postgres'

interface QueryConfig extends PgQueryConfig {
  pool?: string;
}

const QUERY = Symbol('QUERY')

interface Query {
  [QUERY]: true;
  config: QueryConfig;
}

export const query = (config: QueryConfig): Query => ({
  [QUERY]: true,
  config,
})

function isQuery(operation: any): operation is Query {
  return operation && operation[QUERY]
}

export const queryMiddleware = (): Middleware => next => async (operation, ctx) => {
  if (!isQuery(operation)) return next(operation)

  const { pool, ...config } = operation.config

  const client = await getClient(ctx, pool)

  return client.query(config)
}
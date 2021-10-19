import type { QueryConfig as PgQueryConfig } from 'pg'

export interface QueryConfig extends PgQueryConfig {
  pool?: string
  usePoolQuery?: boolean
}

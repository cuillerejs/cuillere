import { Crud, Provider } from '@cuillere/crud'

import { getPools, query } from '../plugins/client'

export async function* buildCrud() {
  const postgres: Provider = {}

  for (const pool of yield getPools()) {
    const { rows: tables } = yield query({
      text: `
        SELECT table_schema AS schema, table_name AS table
        FROM information_schema.tables
        WHERE table_schema NOT LIKE 'pg_%'
        AND table_schema <> 'information_schema'
      `,
      pool,
    })

    postgres[pool] = {}

    for (const { table, schema } of tables) {
      if (!postgres[pool][schema]) postgres[pool][schema] = {}
      postgres[pool][schema][table] = yield makeCrud(schema, table)
    }
  }

  return { postgres } as Crud
}

function* makeCrud(schema: string, table: string) {
  // TODO
  return {}
}

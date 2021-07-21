import { all } from '@cuillere/core'
import type { Crud, Database, Provider } from '@cuillere/crud'

import { getPools, query } from '../plugin'
import { makeGet } from './get'
import { makeList } from './list'
import { TableInfo } from './types'

export function* buildCrud() {
  const postgres: Provider = {}

  const pools = yield getPools()

  yield all(pools.map(function* (pool: string) {
    postgres[pool] = yield buildDatabaseCrud(pool)
  }))

  return { postgres } as Crud
}

function* buildDatabaseCrud(pool: string) {
  const databaseCrud: Database = {}

  const { rows: tables } = yield query({
    text: `
      SELECT table_schema AS schema, table_name AS table
      FROM information_schema.tables
      WHERE table_schema NOT LIKE 'pg_%'
      AND table_schema <> 'information_schema'
    `,
    pool,
  })

  for (const { table, schema } of tables) {
    if (!(schema in databaseCrud)) databaseCrud[schema] = {}
    databaseCrud[schema][table] = yield buildTableCrud(pool, schema, table)
  }

  return databaseCrud
}

function* buildTableCrud(pool: string, schema: string, table: string) {
  const { rows: columns } = yield query({
    text: `
      SELECT column_name AS name, data_type AS type
      FROM information_schema.columns
      WHERE table_schema = $1
      AND table_name = $2
    `,
    values: [schema, table],
    pool,
  })

  const { rows: primaryKeyColumns } = yield query({
    text: `
      SELECT ccu.column_name as name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
      WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_name = $1
      AND tc.table_schema = $2
    `,
    values: [table, schema],
    pool,
  })

  const primaryKey = primaryKeyColumns.map(({ name }) => name)

  const tableInfo: TableInfo = { pool, schema, table, columns, primaryKey }

  return {
    get: makeGet(tableInfo),
    list: makeList(tableInfo),
  }
}

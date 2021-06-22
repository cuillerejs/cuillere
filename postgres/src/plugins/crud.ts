import { Plugin, next, OperationObject } from '@cuillere/core'
import type { Crud, Table } from '@cuillere/crud'

import { getPoolsGetter } from '../pools-getter'
import { query } from './client'

const namespace = '@cuillere/postgres/crud'

export function crudPlugin(): Plugin {
  return {
    handlers: {
      * [`${namespace}/build`](operation: BuildCrud, ctx) {
        const getPools = getPoolsGetter(ctx)
        if (!getPools) throw new Error('No pools getter in context, you probably forgot to setup a client manager')

        const description: Crud = { postgres: {} }

        for (const pool of getPools()) {
          const { rows: tables } = yield query({
            text: `
              SELECT table_schema AS schema, table_name AS table
              FROM information_schema.tables
              WHERE table_schema NOT LIKE 'pg_%'
              AND table_schema <> 'information_schema'
            `,
            pool,
          })

          description.postgres[pool] = {}
          for (const { table, schema } of tables) {
            if (!description.postgres[pool][schema]) description.postgres[pool][schema] = {}
            description.postgres[pool][schema][table] = makeCrud(schema, table)
          }
        }

        return { ...description, ...yield next(operation) }
      },
    },
  }
}

export type BuildCrud = OperationObject

export function buildCrud(): BuildCrud {
  return { kind: `${namespace}/build` }
}

function makeCrud(schema: string, table: string): Table {
  // TODO
  return {}
}

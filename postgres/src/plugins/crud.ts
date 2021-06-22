import { Plugin, next } from '@cuillere/core'
import type { Describe } from '@cuillere/crud'

import { getPoolsGetter } from '../pools-getter'
import { query } from './client'

export function crudPlugin(): Plugin {
  return {
    handlers: {
      * '@cuillere/crud/describe'(describe: Describe, ctx) {
        const getPools = getPoolsGetter(ctx)
        if (!getPools) throw new Error('No pools getter in context, you probably forgot to setup a client manager')

        const description = { postgres: {} }

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

          for (const { table, schema } of tables) {
            if (!description.postgres[schema])description.postgres[schema] = {}
            description.postgres[schema][table] = {}
          }
        }

        return { ...description, ...yield next(describe) }
      },
    },
  }
}

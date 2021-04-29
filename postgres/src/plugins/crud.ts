import { Plugin, next } from '@cuillere/core'
import { Describe } from '@cuillere/crud'

import { getPoolsGetter } from '../pools-getter'
import { query } from './client'

export function crudPlugin(): Plugin {
  return {
    handlers: {
      * '@cuillere/crud/describe'(describe: Describe, ctx) {
        const getPools = getPoolsGetter(ctx)
        if (!getPools) throw new Error('No pools getter in context, you probably forgot to setup a client manager')

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
        }

        yield next(describe)
      },
    },
  }
}

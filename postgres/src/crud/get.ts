import { batched } from '@cuillere/core'

import { query } from '../plugin'
import { TableInfo } from './types'

export function makeGet({ pool, schema, table, columns, primaryKey }: TableInfo, { indexColumnName = '__index' } = {}) {
  if (primaryKey.length === 0) return () => { throw new TypeError('No primary key defined') }

  const primaryKeyTypes = Object.fromEntries(
    columns
      .filter(({ name }) => primaryKey.includes(name))
      .map(({ name, type }) => [name, type]),
  )

  return batched(getBatch)

  function* getBatch(...calls: [any][]) {
    const results = yield get(calls.flatMap(([arg]) => arg))
    let i = 0
    return Array.from(calls, ([arg]) => {
      if (Array.isArray(arg)) return results.slice(i, i += arg.length)
      return results[i++]
    })
  }

  function* get(ids: any[]) {
    const { rows } = yield query({
      text: `
        SELECT "${indexColumnName}", "${schema}"."${table}".*
        FROM UNNEST($1::integer[], ${primaryKey.map((column, i) => `$${i + 2}::${primaryKeyTypes[column]}[]`)})
        AS ids("${indexColumnName}", ${primaryKey.map(column => `"${column}"`).join(', ')})
        JOIN "${schema}"."${table}"
        USING (${primaryKey.map(column => `"${column}"`).join(', ')})
      `,
      values: [
        ids.map((_, i) => i),
        ...unzipIds(ids),
      ],
      pool,
    })

    const result = Array(ids.length)

    for (const row of rows) {
      result[row[indexColumnName]] = row
      delete row[indexColumnName]
    }

    return result
  }

  function unzipIds(ids: any[]) {
    if (primaryKey.length === 1) return [ids]
    return primaryKey.map(column => ids.map(id => id[column]))
  }
}

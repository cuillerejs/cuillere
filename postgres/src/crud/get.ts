import { query } from '../plugin'
import { TableInfo } from './types'

export function makeGet({ pool, schema, table, primaryKey }: TableInfo) {
  if (primaryKey.length === 0) return () => { throw new TypeError('No primary key defined') }

  return function* get(id: any) {
    const { rows } = yield query({
      text: `
        SELECT *
        FROM "${schema}"."${table}"
        WHERE (${primaryKey.map(column => `"${column}"`)}) = ANY($1)
      `,
      values: [[].concat(id).map(idToTuple)],
      pool,
    })

    return rows[0]
  }

  function idToTuple(id: any) {
    if (primaryKey.length === 1) return [id]
    return primaryKey.map(column => id[column])
  }
}

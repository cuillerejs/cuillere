import { query } from '../plugin'
import { TableInfo } from './types'

export function makeGet({ pool, schema, table, primaryKey }: TableInfo) {
  if (primaryKey.length === 0) {
    return () => {
      throw new TypeError('No primary key defined')
    }
  }

  return function* get(id: any) {
    const { rows } = yield query({
      text: `
        SELECT *
        FROM "${schema}"."${table}"
        WHERE ${primaryKey.map((column, i) => `"${column}" = $${i + 1}`).join(' AND ')}
      `,
      values: primaryKey.length === 1 ? [id] : primaryKey.map(column => id[column]),
      pool,
    })

    return rows[0]
  }
}

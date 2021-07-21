import { query } from '../plugin'
import { TableInfo } from './types'

export function makeList({ pool, schema, table, columns }: TableInfo) {
  // FIXME is type useful?
  const columnTypes = Object.fromEntries(columns.map(({ name, type }) => [name, type]))

  return list

  function* list(constraints: { [key: string]: any } = {}) {
    const constraintsEntries = Object.entries(constraints)

    for (const [column] of constraintsEntries) {
      if (!(column in columnTypes)) throw new TypeError(`Unknown column "${column}" on table "${schema}"."${table}"`)
    }

    let text = `
      SELECT "${schema}"."${table}".*
      FROM "${schema}"."${table}"
    `

    if (constraintsEntries.length !== 0) {
      text += `
        WHERE ${constraintsEntries.map(([column], i) => `"${schema}"."${table}"."${column}" = $${i + 1}`).join(' AND ')}
      `
    }

    const { rows } = yield query({
      text,
      values: constraintsEntries.map(([, value]) => value),
      pool,
    })

    return rows
  }
}

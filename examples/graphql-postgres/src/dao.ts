import { batched } from '@cuillere/core'
import { getContext } from '@cuillere/envelop'
import { QueryConfig, query } from '@cuillere/postgres'
import { groupBy, uniq } from 'lodash-es'
import { getUserId } from './auth.js'

type DaoOptions = {
  tableName: string,
  defaultValues?: (ctx: any, entity: any) => Record<string, any>,
}

function makeDAO({ tableName, defaultValues }: DaoOptions) {
  const dao = {
    * all() {
      const { rows } = yield* logedQuery({ text: `SELECT * FROM "${tableName}"` })
      return rows
    },

    * create(entity) {
      const value = defaultValues ? defaultValues(yield* getContext(), entity) : entity
      const { rows } = yield* logedQuery({
        text: `INSERT INTO "${tableName}" (${Object.keys(value).map(key => `"${key}"`).join(', ')}) VALUES (${Object.keys(value).map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
        values: Object.values(value),
      })
      return rows[0]
    },

    get: batched(function* (calls) {
      const ids = calls.flat()
      const { rows } = yield* logedQuery({ text: `SELECT * FROM "${tableName}" WHERE id = ANY($1)`, values: [uniq(ids)] })
      const rowsById = Object.fromEntries(rows.map(row => [row.id, row]))
      return ids.map(id => rowsById[id])
    }),

    listBy: batched(function* (calls) {
      const [[field]] = calls
      const values = calls.map(([, value]) => value)

      const { rows } = yield* logedQuery({ text: `SELECT * FROM "${tableName}" WHERE "${field}" = ANY($1)`, values: [uniq(values)] })

      const rowsByValue = groupBy(rows, field)

      return values.map(value => rowsByValue[value] ?? [])
    }, {
      getBatchKey: field => `list_by_${field}`,
    }),

    delete: batched(function* (calls) {
      const ids = calls.flat()
      const { rows } = yield* logedQuery({ text: `DELETE FROM "${tableName}" WHERE id = ANY($1) RETURNING *`, values: [uniq(ids)] })
      const rowsById = Object.fromEntries(rows.map(row => [row.id, row]))
      return ids.map(id => rowsById[id])
    }),

    deleteBy: batched(function* (calls) {
      const [[field]] = calls
      const values = calls.map(([, value]) => value)

      const { rows } = yield* logedQuery({ text: `DELETE FROM "${tableName}" WHERE "${field}" = ANY($1) RETURNING *`, values: [uniq(values)] })

      const rowsByValue = groupBy(rows, field)

      return values.map(value => rowsByValue[value] ?? [])
    }, {
      getBatchKey: field => `delete_by_${field}`,
    }),
  }

  return dao
}

export const posts = makeDAO({ tableName: 'posts', defaultValues: (ctx, entity) => ({ ...entity, authorId: getUserId(ctx) }) })
export const comments = makeDAO({ tableName: 'comments', defaultValues: (ctx, entity) => ({ ...entity, authorId: getUserId(ctx) }) })
export const users = makeDAO({ tableName: 'users' })

function* logedQuery(queryConfig: QueryConfig) {
  try {
    const result = yield* query(queryConfig)
    console.info('SQL query', queryConfig, result.rows, '\n')
    return result
  } catch (error) {
    console.error('SQL error', queryConfig, error, '\n')
    throw error
  }
}

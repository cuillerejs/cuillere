import { describe, vi, it, Mock, expect, afterEach } from 'vitest'
import { YogaServerInstance, createSchema, createYoga } from 'graphql-yoga'
import { Pool } from 'pg'
import { getContext, useCuillere } from '@cuillere/envelop'
import { batched } from '@cuillere/core'
import { query } from '../src/plugins/cuillere'
import { usePostgres } from '../src/plugins/yoga'

describe('postgres', () => {
  describe('yoga', () => {
    afterEach(() => {
      Object.values(mocks).forEach(mock => mock.mockRestore())
    })

    it('should allow to make a query', async () => {
      const response = await request({ query: '{ value }' })
      expect(response.status).toBe(200)
      const { data } = await response.json()
      expect(data).toEqual({ value: '1' })
    })

    it('should allow to make a mutation', async () => {
      const response = await request({ query: 'mutation { value }' })
      expect(response.status).toBe(200)
      const { data } = await response.json()
      expect(data).toEqual({ value: '1' })
    })

    it('should connect only one client per request', async () => {
      const response = await request({ query: '{ v1: value, v2: value }' })
      expect(response.status).toBe(200)
      const { data } = await response.json()
      expect(data).toEqual({ v1: '1', v2: '1' })
      expect(mocks.connect).toHaveBeenCalledOnce()
    })

    it('should connect only one client per batched requests', async () => {
      const response = await request([{ query: '{ value }' }, { query: '{ value }' }])
      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result).toEqual([{ data: { value: '1' } }, { data: { value: '1' } }])
      expect(mocks.connect).toHaveBeenCalledOnce()
    })

    it('should connect sperate clients for each mutation in batched requests', async () => {
      const response = await request([{ query: 'mutation { value }' }, { query: 'mutation { value }' }])
      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result).toEqual([{ data: { value: '1' } }, { data: { value: '1' } }])
      expect(mocks.connect).toHaveBeenCalledTimes(2)
    })

    it('should release all clients', async () => {
      await request([{ query: 'query { value }' }, { query: 'mutation { value }' }])
      expect(mocks.release).toHaveBeenCalledTimes(2)
    })

    it('should commit transaction on success', async () => {
      await request([{ query: 'mutation { value }' }])
      expect(mocks.query).toHaveBeenCalledWith('BEGIN')
      expect(mocks.query).toHaveBeenCalledWith('COMMIT')
    })

    it('should rollback transaction on error', async () => {
      await request([{ query: 'mutation { error }' }])
      expect(mocks.query).toHaveBeenCalledWith('BEGIN')
      expect(mocks.query).toHaveBeenCalledWith('ROLLBACK')
    })

    it('should not rollback mutation if error in query on same batch', async () => {
      await request([{ query: 'mutation { value }' }, { query: 'query { error }' }])
      expect(mocks.query).toHaveBeenCalledWith('BEGIN')
      expect(mocks.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mocks.query).toHaveBeenCalledWith('COMMIT')
    })

    it('should not rollback query if error in mutation on same batch', async () => {
      await request([{ query: 'query { value }' }, { query: 'mutation { error }' }])
      expect(mocks.query).toHaveBeenCalledWith('BEGIN')
      expect(mocks.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mocks.query).toHaveBeenCalledWith('COMMIT')
    })

    it('should batch get in a single SQL request', async () => {
      const response = await request([{ query: 'query { u1: user(id: "1") { id } }' }, { query: 'query { u2: user(id: "2") { id } }' }])
      const result = await response.json()
      expect(result).toEqual([{ data: { u1: { id: '1' } } }, { data: { u2: { id: '2' } } }])
      expect(mocks.query).toHaveBeenCalledWith({ text: 'SELECT * FROM test_table WHERE id = ANY($1)', values: [['1', '2']] })
    })

    it('should not batch get in a single SQL request queries and mutations', async () => {
      const response = await request([{ query: 'query { u1: user(id: "1") { id } }' }, { query: 'mutation { u2: user(id: "2") { id } }' }])
      const result = await response.json()
      expect(result).toEqual([{ data: { u1: { id: '1' } } }, { data: { u2: { id: '2' } } }])
      expect(mocks.query).toHaveBeenCalledWith({ text: 'SELECT * FROM test_table WHERE id = ANY($1)', values: [['1']] })
      expect(mocks.query).toHaveBeenCalledWith({ text: 'SELECT * FROM test_table WHERE id = ANY($1)', values: [['2']] })
    })

    // FIXME
    it.skip('should give access to the context of the query', async () => {
      let i = 0
      const server = createYoga({
        schema: createSchema({
          typeDefs: /* GraphQL */'type Query { value: Int! } ',
          resolvers: {
            Query: {
              * value() {
                return yield* getContext('test')
              },
            },
          },
        }),
        plugins: [useCuillere(), usePostgres({}), { onExecute: ({ args: { contextValue } }) => contextValue.test = i++ }],
        batching: true,
      })

      const response = await requestYoga(server, [{ query: '{ value }' }, { query: '{ value }' }])
      const result = await response.json()
      expect(result).toEqual([{ data: { value: 1 } }, { data: { value: 2 } }])
    })
  })
})

const resolvers = {
  * value() {
    const { rows: [{ value }] } = yield* query({ text: 'SELECT 1 as value' })
    return value
  },
  * error() {
    yield* query({ text: 'SELECT 1 as value' })
    throw new Error('error')
  },
  async* user(_, { id }) {
    return yield* get('test_table', id)
  },
  noop() {
    return 'noop'
  },
}

const schema = createSchema({
  typeDefs: /* GraphQL */`
    type Query {
      value: String!
      error: String!
      noop: String!
      user(id: String!): User!
    }

    type Mutation {
      value: String!
      error: String!
      noop: String!
      user(id: String!): User!
    }

    type User {
      id: String!
    }
  `,
  resolvers: {
    Query: resolvers,
    Mutation: resolvers,
  },
})

const yoga = createYoga({
  schema,
  plugins: [
    useCuillere(),
    usePostgres({}),
  ],
  batching: true,
})

function request(body: object) {
  return requestYoga(yoga, body)
}

function requestYoga(yoga: YogaServerInstance<any, any>, body: object) {
  return yoga.fetch('https://yoga/graphql', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  })
}

const mocks: Record<string, Mock> = {
  query: vi.fn((arg) => {
    if (Array.isArray(arg?.values?.[0])) {
      // Fake simple seclect by id
      return Promise.resolve({ rows: arg.values[0].map(id => ({ id })) })
    }
    return Promise.resolve({ rows: [{ value: '1' }] })
  }),
  release: vi.fn(),
  connect: vi.fn(() => Promise.resolve({ query: mocks.query, release: mocks.release })),
  poolQuery: vi.fn(),
}

vi.spyOn(Pool.prototype, 'connect').mockImplementation(mocks.connect)
vi.spyOn(Pool.prototype, 'query').mockImplementation(mocks.poolQuery)

const get = batched<[string, string], { id: string }>(function* (calls) {
  const [[tableName]] = calls
  const ids = calls.map(([, id]) => id)

  const sql = { text: `SELECT * FROM ${tableName} WHERE id = ANY($1)`, values: [ids] }
  const { rows } = yield* query<{ id: string }>(sql)
  const rowsById = Object.fromEntries(rows.map(row => [row.id, row]))
  return ids.map(id => rowsById[id])
}, {
  getBatchKey(tableName: string) {
    return `get_by_id_${tableName}`
  },
  wait: 10,
})

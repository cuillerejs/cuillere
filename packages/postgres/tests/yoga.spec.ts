import { describe, vi, it, Mock, expect, afterEach } from 'vitest'
import { createSchema, createYoga } from 'graphql-yoga'
import { Pool } from 'pg'
import { useCuillere } from '@cuillere/envelop'
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
  })
})

const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */`
      type Query {
        value: String!
        error: String!
        noop: String!
      }

      type Mutation {
        value: String!
        error: String!
        noop: String!
      }
    `,
    resolvers: {
      Query: {
        * value() {
          const { rows: [{ value }] } = yield* query({ text: 'SELECT 1 as value' })
          return value
        },
        * error() {
          yield* query({ text: 'SELECT 1 as value' })
          throw new Error('error')
        },
        noop() {
          return 'noop'
        },
      },
      Mutation: {
        * value() {
          const { rows: [{ value }] } = yield* query({ text: 'SELECT 1 as value' })
          return value
        },
        * error() {
          yield* query({ text: 'SELECT 1 as value' })
          throw new Error('error')
        },
        noop() {
          return 'noop'
        },
      },
    },
  }),
  plugins: [
    useCuillere(),
    usePostgres({}),
  ],
  batching: true,
})

function request(body: object) {
  return yoga.fetch('https://yoga/graphql', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  })
}

const mocks: Record<string, Mock> = {
  query: vi.fn(() => Promise.resolve({ rows: [{ value: '1' }] })),
  release: vi.fn(),
  connect: vi.fn(() => Promise.resolve({ query: mocks.query, release: mocks.release })),
  poolQuery: vi.fn(),
}

vi.spyOn(Pool.prototype, 'connect').mockImplementation(mocks.connect)
vi.spyOn(Pool.prototype, 'query').mockImplementation(mocks.poolQuery)

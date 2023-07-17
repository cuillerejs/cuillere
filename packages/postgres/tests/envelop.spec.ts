import { Pool } from 'pg'
import { describe, it, expect, vi, Mock, beforeEach } from 'vitest'
import { createTestkit } from '@envelop/testing'
import { useCuillere } from '@cuillere/envelop'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { ExecutionResult } from '@envelop/core'
import { usePostgres } from '../src/plugins/envelop'
import { PoolManager } from '../src/pool-manager'
import { query } from '../src'

describe('postgres', () => {
  describe('envelop', () => {
    beforeEach(() => {
      Object.values(mocks).forEach(mock => mock.mockClear())
    })

    it('should allow to make a query', async () => {
      const testKit = createTestkit([useCuillere(), usePostgres({ pool: new PoolManager({}) })], schema)

      const result = await testKit.execute(/* GraphQL */'{ now }') as ExecutionResult

      expect(result.data).toEqual({ now: '1' })
    })

    it('should only open one client', async () => {
      const testKit = createTestkit([useCuillere(), usePostgres({ pool: new PoolManager({}) })], schema)

      await testKit.execute(/* GraphQL */`
      {
        now
        now
      }
    `)

      expect(mocks.connect).toHaveBeenCalledOnce()
    })

    it('should release client', async () => {
      const testKit = createTestkit([useCuillere(), usePostgres({ pool: new PoolManager({}) })], schema)

      await testKit.execute(/* GraphQL */'{ now }')

      expect(mocks.release).toHaveBeenCalledOnce()
    })

    it('should begin and commit transaction', async () => {
      const testKit = createTestkit([useCuillere(), usePostgres({ pool: new PoolManager({}) })], schema)

      await testKit.execute(/* GraphQL */'{ now }')

      expect(mocks.query).toHaveBeenCalledWith('BEGIN')
      expect(mocks.query).toHaveBeenCalledWith('COMMIT')
    })

    it('should rollback transaction on error', async () => {
      const testKit = createTestkit([useCuillere(), usePostgres({ pool: new PoolManager({}) })], schema)

      await testKit.execute(/* GraphQL */'{ error }')

      expect(mocks.query).toHaveBeenCalledWith('BEGIN')
      expect(mocks.query).toHaveBeenCalledWith('ROLLBACK')
    })

    it('should not connect client if not required', async () => {
      const testKit = createTestkit([useCuillere(), usePostgres({ pool: new PoolManager({}) })], schema)

      await testKit.execute(/* GraphQL */'{ noop }')

      expect(mocks.connect).not.toHaveBeenCalled()
    })
  })
})

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */`
    type Query {
      now: String!
      error: String!
      noop: String!
    }
  `,
  resolvers: {
    Query: {
      * now() {
        const { rows: [{ value }] } = yield* query({ text: 'SELECT 1 as value' })
        return value
      },
      * error() {
        yield* query({ text: 'SELECT 1 as value' })
        throw new Error('error')
      },
      * noop() {
        return 'noop'
      },
    },
  },
})

const mocks: Record<string, Mock> = {
  query: vi.fn(() => Promise.resolve({ rows: [{ value: '1' }] })),
  release: vi.fn(),
  connect: vi.fn(() => Promise.resolve({ query: mocks.query, release: mocks.release })),
  poolQuery: vi.fn(),
}

vi.spyOn(Pool.prototype, 'connect').mockImplementation(mocks.connect)
vi.spyOn(Pool.prototype, 'query').mockImplementation(mocks.poolQuery)

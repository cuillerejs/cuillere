import { describe, it, expect, vi, afterEach, Mock } from 'vitest'
import { Pool } from 'pg'
import { cuillere } from '@cuillere/core'
import { getClient, postgresPlugin, query } from '../src/plugin'
import { PoolManager } from '../dist'

describe('postgres', () => {
  describe('cuillere', () => {
    afterEach(() => {
      Object.values(mocks).forEach(mock => mock.mockRestore())
    })

    it('should allow make a query', async () => {
      const cllr = cuillere(postgresPlugin({
        pool: new PoolManager({}),
      }))

      await cllr.run(query({ text: 'SELECT 1' }))

      expect(mocks.query).toHaveBeenCalledWith({ text: 'SELECT 1' })
    })

    it('should only open one client', async () => {
      const cllr = cuillere(postgresPlugin({
        pool: new PoolManager({}),
      }))

      await cllr.run(function* () {
        yield* getClient()
        yield* getClient()
      }())

      expect(mocks.connect).toBeCalledTimes(1)
    })

    it('should release client', async () => {
      const cllr = cuillere(postgresPlugin({
        pool: new PoolManager({}),
      }))

      await cllr.run(query({ text: 'SELECT 1' }))

      expect(mocks.release).toHaveBeenCalled()
    })

    it('should begin and commit transaction', async () => {
      const cllr = cuillere(postgresPlugin({
        pool: new PoolManager({}),
      }))

      await cllr.run(query({ text: 'SELECT 1' }))

      expect(mocks.query).toHaveBeenCalledWith('BEGIN')
      expect(mocks.query).toHaveBeenCalledWith('COMMIT')
    })

    it('should rollback transaction on error', async () => {
      const cllr = cuillere(postgresPlugin({
        pool: new PoolManager({}),
      }))

      await expect(cllr.run(function* () {
        yield* query({ text: 'SELECT 1' })
        throw new Error('test')
      }())).rejects.toThrow('test')

      expect(mocks.query).toHaveBeenCalledWith('BEGIN')
      expect(mocks.query).toHaveBeenCalledWith('ROLLBACK')
    })

    it('should not connect client if not required', async () => {
      const cllr = cuillere(postgresPlugin({
        pool: new PoolManager({}),
      }))

      await cllr.run(function* () {
        return null
      }())

      expect(mocks.connect).not.toHaveBeenCalled()
    })
  })
})

const mocks: Record<string, Mock> = {
  query: vi.fn(),
  release: vi.fn(),
  connect: vi.fn(() => Promise.resolve({ query: mocks.query, release: mocks.release })),
  poolQuery: vi.fn(),
}

vi.spyOn(Pool.prototype, 'connect').mockImplementation(mocks.connect)
vi.spyOn(Pool.prototype, 'query').mockImplementation(mocks.poolQuery)

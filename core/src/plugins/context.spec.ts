import cuillere, { get, set } from '..'
import { Cuillere } from '../cuillere'

describe('middlewares', () => {
  let cllr: Cuillere

  beforeEach(() => {
    cllr = cuillere()
  })

  describe('context', () => {
    it('should allow to set a value in context', async () => {
      const ctx = { }
      await cllr.ctx(ctx).start(set('test', 'value'))
      expect(ctx).toMatchObject({ test: 'value' })
    })

    it('should allow to get a value from context', async () => {
      const ctx = { test: 'value' }
      await expect(cllr.ctx(ctx).start(get('test'))).resolves.toBe('value')
    })

    it('should allow symbol as key', async () => {
      const symbol = Symbol('test')
      await expect(cllr.start(set(symbol, 'value'))).resolves.toBeUndefined()
      await expect(cllr.start(get(symbol))).resolves.toBe('value')
    })

    it('should allow string as key', async () => {
      await expect(cllr.start(set('test', 'value'))).resolves.toBeUndefined()
      await expect(cllr.start(get('test'))).resolves.toBe('value')
    })

    it('should allow number as key', async () => {
      await expect(cllr.start(set(1, 'value'))).resolves.toBeUndefined()
      await expect(cllr.start(get(1))).resolves.toBe('value')
    })
  })
})

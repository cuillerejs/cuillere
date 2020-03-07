import cuillere, { get, set } from '../../src'

describe('middlewares', () => {
  let cllr

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
      const result = await cllr.ctx(ctx).start(get('test'))
      expect(result).toBe('value')
    })

    it('should allow symbol as key', async () => {
      const symbol = Symbol('test')
      await expect(cllr.start(set(symbol, 'value'))).resolves.not.toThrow()
      await expect(cllr.start(get(symbol))).resolves.toBe('value')
    })

    it('should allow string as key', async () => {
      await expect(cllr.start(set('test', 'value'))).resolves.not.toThrow()
      await expect(cllr.start(get('test'))).resolves.toBe('value')
    })

    it('should allow number as key', async () => {
      await expect(cllr.start(set(1, 'value'))).resolves.not.toThrow()
      await expect(cllr.start(get(1))).resolves.toBe('value')
    })

    it.skip('should not allow other types than number, string or symbol as key', async () => {
      await expect(cllr.start(get({} as string))).rejects.toThrow()
      await expect(cllr.start(get(null))).rejects.toThrow()
      await expect(cllr.start(get(undefined))).rejects.toThrow()
      await expect(cllr.start(set({} as string, null))).rejects.toThrow()
      await expect(cllr.start(set(null, null))).rejects.toThrow()
      await expect(cllr.start(set(undefined, null))).rejects.toThrow()
    })
  })
})

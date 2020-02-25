import cuillere, { Cuillere, call, GeneratorFunction } from '../src'
import { batched, batchMiddelware } from '../src/middlewares/batch'

const delay = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

const afterDelay = async (fn: () => void, d: number) => {
  await delay(d)
  return fn()
}

describe('middlewares', () => {
  describe('batch', () => {
    let cllr: Cuillere
    const mock = jest.fn()
    let fn: GeneratorFunction

    beforeEach(() => {
      cllr = cuillere(batchMiddelware({ timeout: 0 }))
      mock.mockClear()
      fn = batched(function* fn(...args: any[]) {
        mock(...args)
        return [].concat(...args)
      })
    })

    it('should call a given operation', async () => {
      await cllr.start(call(fn))

      expect(mock).toBeCalled()
    })

    it('should call only once for multiple batched calls', async () => {
      await Promise.all([
        cllr.start(call(fn)),
        cllr.start(call(fn)),
        cllr.start(call(fn)),
      ])

      expect(mock).toBeCalledTimes(1)
    })

    it('should call with an array of calls with the right length', async () => {
      await Promise.all([
        cllr.start(call(fn, 1)),
        cllr.start(call(fn, 2)),
        cllr.start(call(fn, 3)),
      ])

      expect(mock.mock.calls[0].length).toBe(3)
    })

    it('should call with all given arguments', async () => {
      await Promise.all([
        cllr.start(call(fn, 1)),
        cllr.start(call(fn, 2)),
      ])

      expect(mock.mock.calls[0]).toContainEqual([1])
      expect(mock.mock.calls[0]).toContainEqual([2])
    })

    it('should return the right result for each btached call', async () => {
      const result = await Promise.all([
        cllr.start(call(fn, 1)),
        cllr.start(call(fn, 2)),
        cllr.start(call(fn, 3)),
      ])

      expect(result).toEqual([1, 2, 3])
    })

    it("shouldn't batch calls after timeout", async () => {
      await cllr.call(fn)
      await delay(1)
      await cllr.call(fn)
      expect(mock).toBeCalledTimes(2)
    })

    it('should not debounce batch calls', async () => {
      cllr = cuillere(batchMiddelware({ timeout: 30 }))

      await Promise.all([
        cllr.call(fn, 1),
        afterDelay(() => cllr.call(fn, 2), 30),
        afterDelay(() => cllr.call(fn, 3), 45),
      ])

      expect(mock).toBeCalledTimes(2)
      expect(mock.mock.calls).toEqual([
        [[1], [2]],
        [[3]],
      ])
    })

    it('should not batch if batch key is falsy', async () => {
      const notBatched = batched(function* notBatched(...args: any[]) {
        mock(...args)
        return [].concat(...args)
      }, () => false)

      await Promise.all([
        cllr.start(call(notBatched)),
        cllr.start(call(notBatched)),
        cllr.start(call(notBatched)),
      ])

      expect(mock).toBeCalledTimes(3)
    })

    it('should batch together calls with the same batch key', async () => {
      const fn = batched(function* fn(...args: any[]) {
        mock(...args)
        return [].concat(...args)
      }, arg => arg)

      await Promise.all([
        cllr.start(call(fn, 1)),
        cllr.start(call(fn, 1)),
        cllr.start(call(fn, 2)),
        cllr.start(call(fn, 2)),
      ])

      expect(mock).toBeCalledTimes(2)
      expect(mock.mock.calls).toEqual([
        [[1], [1]],
        [[2], [2]],
      ])
    })
  })
})

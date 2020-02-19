/* eslint-env jest */
import cuillere, { Cuillere } from '../src'
import { batchedCall, batchMiddelware } from '../src/middlewares/batch'

describe('middlewares', () => {
  describe('batch', () => {
    let cllr: Cuillere
    const mock = jest.fn()

    function* fn(...args: any[]) {
      mock(...args)
      return [].concat(...args)
    }

    beforeEach(() => {
      cllr = cuillere(batchMiddelware())
      mock.mockClear()
    })

    it('should call a given operation', async () => {
      await cllr.start(batchedCall(fn))

      expect(mock).toBeCalled()
    })

    it('should call only once for multiple batched calls', async () => {
      await Promise.all([
        cllr.start(batchedCall(fn)),
        cllr.start(batchedCall(fn)),
        cllr.start(batchedCall(fn))
      ])

      expect(mock).toBeCalledTimes(1)
    })

    it('should call with an array of calls', async () => {
      await Promise.all([
        cllr.start(batchedCall(fn, 1)),
        cllr.start(batchedCall(fn, 2)),
        cllr.start(batchedCall(fn, 3))
      ])

      expect(mock).toBeCalledWith([1], [2], [3])
    })

    it('should return the right result for each btached call', async () => {
      const result = await Promise.all([
        cllr.start(batchedCall(fn, 1)),
        cllr.start(batchedCall(fn, 2)),
        cllr.start(batchedCall(fn, 3))
      ])

      expect(result).toEqual([1, 2, 3])
    })
  })
})
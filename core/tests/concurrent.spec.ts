/* eslint-disable no-throw-literal */

import cuillere, { call, Cuillere } from '../src'
import { all, allSettled, chain } from '../src/middlewares/concurrent'

const delay = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

describe('concurrent', () => {
  let cllr: Cuillere
  let executionOrder: number[]

  async function* f1() {
    await delay(30)
    executionOrder.push(1)
    return 1
  }

  async function* f2() {
    await delay(20)
    executionOrder.push(2)
    return 2
  }

  async function* f3() {
    await delay(10)
    executionOrder.push(3)
    return 3
  }

  beforeEach(() => {
    executionOrder = []
    cllr = cuillere()
  })

  describe('all', () => {
    it('should run all operations in parallel', async () => {
      function* test() {
        return yield all([call(f1), call(f2), call(f3)])
      }

      const result = await cllr.call(test)

      expect(result).toEqual([1, 2, 3])
      expect(executionOrder).toEqual([3, 2, 1])
    })

    it('should cancel all operations on first fail', async () => {
      let called = false

      function* f1() {
        throw { error: 'test' }
      }

      async function* f2() {
        await delay(10)
        yield call(f3)
      }

      function* f3() {
        called = true
      }

      await expect(cllr.start(all([call(f1), call(f2)]))).rejects.toEqual({ error: 'test', errors: [] })
      expect(called).toBe(false)
    })
  })

  describe('allSettled', () => {
    it('should run all operations in parallele and settle', async () => {
      function* test() {
        return yield allSettled([call(f1), call(f2), call(f3)])
      }

      const result = await cllr.call(test)

      expect(result).toEqual([{ status: 'fulfilled', value: 1 }, { status: 'fulfilled', value: 2 }, { status: 'fulfilled', value: 3 }])
      expect(executionOrder).toEqual([3, 2, 1])
    })
  })

  describe('chain', () => {
    it('should run all operations one at a time', async () => {
      function* test() {
        return yield chain([() => call(f1), () => call(f2), () => call(f3)])
      }

      const result = await cllr.call(test)

      expect(result).toEqual(3)
      expect(executionOrder).toEqual([1, 2, 3])
    })

    it('should pass the result of the previous function to each function in chain', async () => {
      function* f1() {
        return 1
      }

      function* f2(prev) {
        return prev
      }

      const result = await cllr.start(chain([() => call(f1), prev => call(f2, prev)]))

      expect(result).toBe(1)
    })
  })
})

/* eslint-env jest */

import cuillere, { Cuillere, call, fork, cancel } from '../src'

const delay = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

describe('run', () => {
  let cllr: Cuillere
  beforeEach(() => {
    cllr = cuillere()
  })

  describe('runCallOperation', () => {
    it('should return the result of a simple generator function', async () => {
      function* test() {
        return 'test'
      }

      expect(await cllr.call(test)).toBe('test')
    })

    it('should pass arguments to the generator function', async () => {
      function* test(...args) {
        return args
      }
      const testArgs = [1, 2, 3, 4]

      expect(await cllr.call(test, ...testArgs)).toEqual(testArgs)
    })

    it('should run yielded operations', async () => {
      function* test1() {
        return 'test1'
      }

      function* test2() {
        return 'test2'
      }

      function* test3() {
        const result1 = yield call(test1)
        const result2 = yield call(test2)
        return [result1, result2]
      }

      expect(await cllr.call(test3)).toEqual(['test1', 'test2'])
    })

    it('should allow to use finaly to clean up canceled calls', async () => {
      let called = false

      async function* f1() {
        const task = yield fork(call(f2))
        await cancel(task)
      }

      async function* f2() {
        try {
          await delay(10)
          return
        } finally {
          called = true
        }
      }

      await cllr.call(f1)

      expect(called).toBe(true)
    })

    it("shouldn't allow to use catch to stop cancelation", async () => {
      let called = false

      async function* f1() {
        const task = yield fork(call(f2))
        await cancel(task)
      }

      async function* f2() {
        try {
          await delay(10)
          return
        } catch (err) {
          called = true
        }
      }

      await cllr.call(f1)

      expect(called).toBe(false)
    })
  })
})

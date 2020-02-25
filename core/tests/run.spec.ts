import cuillere, { Cuillere, call, fork, defer } from '../src'

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
        const task = yield fork(f2)
        await delay(10) // let some time for f2 to start
        await task.cancel()
      }

      async function* f2() {
        try {
          await delay(20)
          yield 'anything...' // let cancellation happen
        } finally {
          yield call(f3)
        }
      }

      async function* f3() {
        called = true
      }

      await cllr.call(f1)

      expect(called).toBe(true)
    })

    it("shouldn't allow to use catch to stop cancellation", async () => {
      let called = false

      async function* f1() {
        const task = yield fork(f2)
        await delay(10) // let some time for f2 to start
        await task.cancel()
      }

      async function* f2() {
        try {
          await delay(10)
          yield 'anything...' // let cancellation happen
        } catch (err) {
          called = true
        }
      }

      await cllr.call(f1)

      expect(called).toBe(false)
    })
  })

  describe('defer', () => {
    let defers: number[]

    beforeEach(() => {
      defers = []
    })

    function* push(n: number) {
      defers.push(n)
    }

    function* throwError(message: string) {
      throw new Error(message)
    }

    it('should be called in reversed order', async () => {
      function* test() {
        yield defer(push, 3)
        yield defer(push, 2)
        yield defer(push, 1)
        return 4
      }

      await expect(cllr.call(test)).resolves.toBe(4)
      expect(defers).toEqual([1, 2, 3])
    })

    it('should be called on uncaught exception', async () => {
      function* test() {
        yield defer(push, 3)
        yield defer(push, 2)
        yield defer(push, 1)
        throw new Error('foo')
      }

      const res = cllr.call(test)

      await expect(res).rejects.toBeInstanceOf(Error)
      await expect(res).rejects.toHaveProperty('message', 'foo')
      expect(defers).toEqual([1, 2, 3])
    })

    it('should be called after uncaught exception in defer', async () => {
      function* test() {
        yield defer(push, 2)
        yield defer(throwError, 'foo')
        yield defer(push, 1)
        return 4
      }

      const res = cllr.call(test)

      await expect(res).rejects.toBeInstanceOf(Error)
      await expect(res).rejects.toHaveProperty('message', 'foo')
      expect(defers).toEqual([1, 2])
    })

    it('should throw error from defer', async () => {
      function* test() {
        yield defer(push, 2)
        yield defer(throwError, 'bar')
        yield defer(push, 1)
        throw new Error('foo')
      }

      const res = cllr.call(test)

      await expect(res).rejects.toBeInstanceOf(Error)
      await expect(res).rejects.toHaveProperty('message', 'bar')
      expect(defers).toEqual([1, 2])
    })
  })
})

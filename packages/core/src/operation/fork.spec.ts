import cuillere, { Cuillere, fork, call, defer } from '..'

async function* identity(arg: any) {
  return arg
}

const delay = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

describe('fork', () => {
  let cllr: Cuillere

  beforeEach(() => {
    cllr = cuillere()
  })

  it('should fork an effect', async () => {
    async function* test() {
      const { result } = yield fork(call(identity, 'foo'))
      return result
    }

    await expect(cllr.start(call(test))).resolves.toBe('foo')
  })

  it('should fork a call', async () => {
    async function* test() {
      const { result } = yield fork(identity, 'bar')
      return result
    }

    await expect(cllr.start(call(test))).resolves.toBe('bar')
  })

  describe('cancel', () => {
    it('should allow to use finally and defer to clean up canceled calls', async () => {
      let cleanups = 0

      async function* f1() {
        const task = yield fork(f2)
        await delay(10) // let some time for f2 to start
        await task.cancel()
      }

      async function* f2() {
        yield defer(cleanup())
        yield defer(cleanup())
        yield defer(cleanup())

        try {
          await delay(20)
          yield { kind: 'let cancellation happen' }
        } finally {
          yield cleanup()
          yield cleanup()
          yield cleanup()
        }
      }

      function* cleanup() {
        cleanups++
      }

      await cllr.call(f1)

      expect(cleanups).toBe(6)
    })

    it("shouldn't allow to use catch to stop cancellation", async () => {
      let catched = false

      async function* f1() {
        const task = yield fork(f2)
        await delay(10) // let some time for f2 to start
        await task.cancel()
      }

      async function* f2() {
        try {
          await delay(20)
          yield { kind: 'let cancellation happen' }
        } catch (e) {
          catched = true
        }
      }

      await cllr.call(f1)

      expect(catched).toBe(false)
    })
  })
})

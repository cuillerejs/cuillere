import cuillere, { fork, call } from '..'
import { Cuillere } from '../cuillere'

async function* identity(arg: any) {
  return arg
}

const delay = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

describe('fork', () => {
  let cllr: Cuillere

  beforeEach(() => {
    cllr = cuillere()
  })

  it('should fork an operation', async () => {
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
    it('should allow to use finally to clean up canceled calls', async () => {
      let called = false

      async function* f1() {
        const stack = yield fork(f2)
        await delay(10) // let some time for f2 to start
        await stack.cancel()
      }

      async function* f2() {
        try {
          await delay(20)
          yield { kind: 'let cancellation happen' }
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
      let catched = false

      async function* f1() {
        const stack = yield fork(f2)
        await delay(10) // let some time for f2 to start
        await stack.cancel()
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

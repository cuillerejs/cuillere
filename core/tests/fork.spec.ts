import cuillere, { fork, call } from '../src'

describe('fork', () => {
  const cllr = cuillere()

  async function* identity(arg: any) {
    return arg
  }

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
})

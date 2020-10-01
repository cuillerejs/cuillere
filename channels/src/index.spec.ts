import cuillere, { Cuillere, call, fork } from '@cuillere/core'
import { chan, send, recv, close, range, select, channelsPlugin } from '.'

describe('channels', () => {
  let cllr: Cuillere

  beforeEach(() => {
    cllr = cuillere(channelsPlugin())
  })

  async function* delayedCall(delay, func, ...args) {
    await new Promise(resolve => setTimeout(resolve, delay))
    yield call(func, ...args)
  }

  it('should use unbuffered channel', async () => {
    async function* test() {
      const ch = yield chan()
      yield fork(delayedCall, 100, test2, ch)
      yield call(echo, 'do something else...')
      yield call(echo, `Recevied: ${yield recv(ch)}`)
    }

    function* test2(ch) {
      yield send(ch, 'test2')
    }

    function* echo(str) {
      console.log(str)
    }

    await cllr.call(test)
  })

  it('should use buffered channel', async () => {
    async function* test() {
      const ch = yield chan(3)
      yield fork(delayedCall, 100, test2, ch)
      for (let i = 0; i < 10; i++) {
        yield send(ch, i * 2)
        yield call(echo, `Sent: ${i * 2}`)
      }
    }

    function* test2(ch) {
      for (let i = 0; i < 10; i++) yield call(echo, `Recevied: ${yield recv(ch)}`)
    }

    function* echo(str) {
      console.log(str)
    }

    await cllr.call(test)
  })

  it('should close channel', async () => {
    async function* test() {
      const ch = yield chan(3)

      yield send(ch, 1)
      yield send(ch, 2)
      yield send(ch, 3)

      yield close(ch)

      expect(yield recv(ch)).toBe(1)
      expect(yield recv(ch, true)).toEqual([2, true])
      expect(yield recv(ch)).toBe(3)

      expect(yield recv(ch)).toBeUndefined()
      expect(yield recv(ch, true)).toEqual([undefined, false])

      try {
        yield send(ch, 4)
        throw new Error('should have thrown TypeError')
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError) // eslint-disable-line jest/no-try-expect
      }

      // WORKAROUND: see https://github.com/nodejs/node/issues/31867
      return undefined
    }

    await cllr.call(test)
  })

  it('should use range over channel', async () => {
    async function* test() {
      const ch = yield chan()

      yield fork(test2, ch)

      const res = []
      for await (const i of yield range(ch)) {
        res.push(i)
      }

      expect(res).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    }

    function* test2(ch) {
      for (let i = 0; i < 10; i++) {
        yield send(ch, i)
      }
      yield close(ch)
    }

    await cllr.call(test)
  })

  it('should select 1', async () => {
    async function* test() {
      const ch1 = yield chan()
      const ch2 = yield chan()

      yield fork(test2, ch2)

      {
        const [i, res] = yield select(
          recv(ch1),
          recv(ch2),
        )

        expect(i).toBe(1)
        expect(res).toBe('foo')
      }

      {
        const [i] = yield select(
          send(ch1, 'bar'),
          select.default,
        )

        expect(i).toBe(1)
      }
    }

    function* test2(ch) {
      yield send(ch, 'foo')
    }

    await cllr.call(test)
  })

  it('should select 2', async () => {
    async function* test() {
      const ch1 = yield chan()
      const ch2 = yield chan()

      yield fork(test2, ch1, ch2)

      yield send(ch1, 'foo')

      const [i] = yield select(
        send(ch2, 'bar'),
        select.default,
      )

      expect(i).toBe(1)
    }

    function* test2(ch1, ch2) {
      const [i, res] = yield select(
        recv(ch1),
        recv(ch2),
      )

      expect(i).toBe(0)
      expect(res).toBe('foo')
    }

    await cllr.call(test)
  })
})

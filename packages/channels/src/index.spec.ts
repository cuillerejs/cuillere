import { describe, beforeEach, it, expect } from 'vitest'

import { Cuillere, call, cuillere, fork } from '@cuillere/core'
import { chan, send, recv, close, range, select, channelsPlugin } from '.'

describe('channels', () => {
  let cllr: Cuillere

  beforeEach(() => {
    cllr = cuillere(channelsPlugin())
  })

  async function* delayedCall(delay, func, ...args) {
    await new Promise((resolve) => { setTimeout(resolve, delay) })
    yield call(func, ...args)
  }

  it('should use unbuffered channel', async () => {
    async function* test() {
      const ch = chan()
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
      const ch = chan(3)
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
      const ch = chan(3)

      yield send(ch, 1)
      yield send(ch, 2)
      yield send(ch, 3)

      close(ch)

      expect(yield recv(ch)).toBe(1)
      expect(yield recv(ch, true)).toEqual([2, true])
      expect(yield recv(ch)).toBe(3)

      expect(yield recv(ch)).toBeUndefined()
      expect(yield recv(ch, true)).toEqual([undefined, false])

      let catched: any
      try {
        yield send(ch, 4)
        throw new Error('should have thrown TypeError')
      } catch (e) {
        catched = e
      }

      expect(catched).toBeInstanceOf(TypeError)

      // avoids https://bugs.chromium.org/p/v8/issues/detail?id=10238
      return undefined
    }

    await cllr.call(test)
  })

  it('should use range over channel', async () => {
    async function* test() {
      const ch = chan()

      yield fork(test2, ch)

      const res = []
      for await (const i of range(ch)) {
        res.push(i)
      }

      expect(res).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    }

    function* test2(ch) {
      for (let i = 0; i < 10; i++) {
        yield send(ch, i)
      }
      close(ch)
    }

    await cllr.call(test)
  })

  it('should select 1', async () => {
    async function* test() {
      const ch1 = chan()
      const ch2 = chan()

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
    function* test() {
      const ch1 = chan()
      const ch2 = chan()

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

  it('should select with callbacks', async () => {
    let sent
    let received

    function* test() {
      const ch1 = chan()
      const ch2 = chan()
      const ch3 = chan()

      yield fork(function* () {
        yield select(
          [send(ch2, 'ch2'), () => { sent = 'ch2' }],
          [send(ch3, 'ch3'), () => { sent = 'ch3' }],
        )
      })

      yield select(
        [recv(ch1), function* (v) { received = v }],
        [recv(ch2), function* (v) { received = v }],
      )
    }

    await cllr.call(test)

    expect(sent).toBe('ch2')
    expect(received).toBe('ch2')
  })
})

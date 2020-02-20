/* eslint-env jest */
/* eslint-disable consistent-return, no-throw-literal */

import cuillere, { Cuillere, call } from '../src'

describe('call', () => {
  let cllr: Cuillere

  beforeEach(() => {
    cllr = cuillere()
  })

  function* throwValue(value?: any) {
    if (value) throw value
  }

  it('should throw uncaught exception', async () => {
    function* test() {
      throw 'testError'
    }

    await expect(cllr.call(test)).rejects.toBe('testError')
  })

  it('should throw uncaught exception (async)', async () => {
    async function* test() {
      throw 'testError'
    }

    await expect(cllr.call(test)).rejects.toBe('testError')
  })

  it('should throw uncaught exception from nested call', async () => {
    function* throwValue(value?: any) {
      if (value) throw value
    }

    function* test() {
      yield call(throwValue, 'testError')
    }

    await expect(cllr.call(test)).rejects.toBe('testError')
  })

  it('should throw uncaught exception from nested call (async)', async () => {
    function* throwValue(value?: any) {
      if (value) throw value
    }

    async function* test() {
      yield call(throwValue, 'testError')
    }

    await expect(cllr.call(test)).rejects.toBe('testError')
  })

  it('should catch and return exception from nested call', async () => {
    function* test() {
      try {
        yield call(throwValue, 'testError')
      } catch (e) {
        return e
      }
    }

    expect(await cllr.call(test)).toBe('testError')
  })

  it('should catch and return exception from nested call (async)', async () => {
    async function* test() {
      try {
        yield call(throwValue, 'testError')
      } catch (e) {
        return e
      }
    }

    expect(await cllr.call(test)).toBe('testError')
  })

  it('should catch and recall nested call', async () => {
    function* test() {
      try {
        yield call(throwValue, 'testError')
      } catch (e) {
        yield call(throwValue, e)
      }
    }

    await expect(cllr.call(test)).rejects.toBe('testError')
  })

  it('should catch and recall nested call (async)', async () => {
    function* test() {
      try {
        yield call(throwValue, 'testError')
      } catch (e) {
        yield call(throwValue, e)
      }
    }

    await expect(cllr.call(test)).rejects.toBe('testError')
  })

  it('should accept generator as first parameter', async () => {
    function* test() {
      return 'test'
    }

    expect(await cllr.execute(test())).toBe('test')
  })
})

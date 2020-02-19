/* eslint-env jest */

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

    try {
      await cllr.call(test)
      fail('did not throw')
    } catch (e) {
      expect(e).toBe('testError')
    }
  })

  it('should throw uncaught exception (async)', async () => {
    async function* test() {
      throw 'testError'
    }

    try {
      await cllr.call(test)
      fail('did not throw')
    } catch (e) {
      expect(e).toBe('testError')
    }
  })

  it('should throw uncaught exception from nested call', async () => {
    function* throwValue(value?: any) {
      if (value) throw value
    }

    function* test() {
      yield call(throwValue, 'testError')
    }

    try {
      await cllr.call(test)
      fail('did not throw')
    } catch (e) {
      expect(e).toBe('testError')
    }
  })

  it('should throw uncaught exception from nested call (async)', async () => {
    function* throwValue(value?: any) {
      if (value) throw value
    }

    async function* test() {
      yield call(throwValue, 'testError')
    }

    try {
      await cllr.call(test)
      fail('did not throw')
    } catch (e) {
      expect(e).toBe('testError')
    }
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

    try {
      await cllr.call(test)
      fail('did not throw')
    } catch (e) {
      expect(e).toBe('testError')
    }
  })

  it('should catch and recall nested call (async)', async () => {
    function* test() {
      try {
        yield call(throwValue, 'testError')
      } catch (e) {
        yield call(throwValue, e)
      }
    }

    try {
      await cllr.call(test)
      fail('did not throw')
    } catch (e) {
      expect(e).toBe('testError')
    }
  })

  it('should accept generator as first parameter', async () => {
    function* test() {
      return 'test'
    }

    expect(await cllr.execute(test())).toBe('test')
  })
})

/* eslint-env jest */
/* eslint-disable require-yield */

import { makeRunner, call } from '../src'

describe('call', () => {
  let run: Function

  beforeEach(() => {
    run = makeRunner()()
  })

  function* throwValue(value?: any) {
    if (value) throw value
  }

  it('should throw uncaught exception', async () => {
    function* test() {
      throw 'testError'
    }

    try {
      await run(call(test))
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
      await run(call(test))
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
      await run(call(test))
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
      await run(call(test))
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

    expect(await run(call(test))).toBe('testError')
  })

  it('should catch and return exception from nested call (async)', async () => {
    async function* test() {
      try {
        yield call(throwValue, 'testError')
      } catch (e) {
        return e
      }
    }

    expect(await run(call(test))).toBe('testError')
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
      await run(call(test))
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
      await run(call(test))
      fail('did not throw')
    } catch (e) {
      expect(e).toBe('testError')
    }
  })
})

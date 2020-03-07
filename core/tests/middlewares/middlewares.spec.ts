import cuillere, { Cuillere, Middleware, next } from '../../src'

describe('middlewares', () => {
  const test = async (cllr: Cuillere, expected = 'test') => {
    function* func() {
      return 'test'
    }
    expect(await cllr.call(func)).toBe(expected)
  }

  it('should work with no middlwares', async () => {
    const cllr = cuillere()
    await test(cllr)
  })

  it('should call middlewares for call operation', async () => {
    const middleware1Fn = jest.fn()
    const middleware1: Middleware = {
      async* call(operation) {
        middleware1Fn()
        console.log('middleware 1')
        return yield next(operation)
      },
    }

    const middleware2Fn = jest.fn()
    const middleware2: Middleware = {
      async* call(operation) {
        middleware2Fn()
        console.log('middleware 2')
        return yield next(operation)
      },
    }

    const cllr = cuillere(middleware1, middleware2)

    await test(cllr)
    expect(middleware1Fn).toBeCalled()
    expect(middleware2Fn).toBeCalled()
  })

  it('should call middlewares in right ordrer', async () => {
    const middleware1: Middleware = { async* call(operation) { return `expected ${yield next(operation)}` } }
    const middleware2: Middleware = { async* call(operation) { return `returned ${yield next(operation)}` } }
    const middleware3: Middleware = { async* call() { return 'value' } }

    const cllr = cuillere(middleware1, middleware2, middleware3)

    await test(cllr, 'expected returned value')
  })

  // SKIPPED: waiting for node bug resolution : https://github.com/nodejs/node/issues/31867
  it.skip('should be able to catch exception from middleware', async () => {
    const throwOperation = () => ({ kind: 'throw' })
    const error = { error: 'test' }

    async function* test() {
      try {
        yield throwOperation()
      } catch (err) {
        expect(err).toEqual({ error: 'test' }) // eslint-disable-line jest/no-try-expect
      }
    }

    const middleware: Middleware = {
      async* throw() {
        throw error
      },
    }

    try {
      await cuillere(middleware).call(test)
    } catch (err) {
      throw new Error("middleware exception shouldn't be rethrown")
    }
  })
})

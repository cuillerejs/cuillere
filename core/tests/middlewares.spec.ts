import cuillere, { Cuillere, Middleware } from '../src'

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

  it('should call all middlewares', async () => {
    const middleware1Fn = jest.fn()
    const middleware1: Middleware = function* middleware1(operation, _ctx, next) {
      middleware1Fn()
      return yield next(operation)
    }

    const middleware2Fn = jest.fn()
    const middleware2: Middleware = function* middleware2(operation, _ctx, next) {
      middleware2Fn()
      return yield next(operation)
    }

    const cllr = cuillere(middleware1, middleware2)

    await test(cllr)
    expect(middleware1Fn).toBeCalled()
    expect(middleware2Fn).toBeCalled()
  })

  it('should call middlewares in right ordrer', async () => {
    const middleware1: Middleware = function* middleware1(operation, _ctx, next) { return `expected ${yield next(operation)}` }
    const middleware2: Middleware = function* middleware2(operation, _ctx, next) { return `returned ${yield next(operation)}` }
    const middleware3: Middleware = function* middleware3() { return 'value' }

    const cllr = cuillere(middleware1, middleware2, middleware3)

    await test(cllr, 'expected returned value')
  })

  // SKIPPED: waiting for node bug resolution : https://github.com/nodejs/node/issues/31867
  it.skip('should be able to catch exception from middleware', async () => {
    const throwOperation = { op: 'throw' }
    const error = { error: 'test' }

    async function* test() {
      try {
        yield throwOperation
      } catch (err) {
        expect(err).toEqual({ error: 'test' }) // eslint-disable-line jest/no-try-expect
      }
    }

    const middleware: Middleware = function* middleware(op, _ctx, next) {
      if (op === throwOperation) throw error
      return yield next(op)
    }

    try {
      await cuillere(middleware).call(test)
    } catch (err) {
      throw new Error("middleware exception shouldn't be rethrown")
    }
  })
})

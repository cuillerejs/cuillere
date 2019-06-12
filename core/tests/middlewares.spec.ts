/*eslint-en jest*/
import { makeRunner, Middleware, call } from '../src'

describe('middlewares', () => {
  const test = async (run, expected = 'test') => {
    function* func() {
      return 'test'
    }
    expect(await run(call(func))).toBe(expected)
  }

  it('should work with no middlwares', async () => {
    const run = makeRunner()()
    await test(run)
  })

  it('should call all middlewares', async () => {
    const middleware1 = jest.fn().mockImplementation(next => operation => next(operation))
    const middleware2 = jest.fn().mockImplementation(next => operation => next(operation))
    const run = makeRunner(middleware1, middleware2)()

    await test(run)
    await expect(middleware1).toBeCalled
    await expect(middleware2).toBeCalled
  })

  it('should call middlewares in right ordrer', async () => {
    const middleware1: Middleware = next => async operation => 'expected ' + (await next(operation))
    const middleware2: Middleware = next => async operation => 'returned ' + (await next(operation))
    const middleware3: Middleware = () => async () => 'value'

    const run = makeRunner(middleware1, middleware2, middleware3)()

    await test(run, 'expected returned value')
  })
})

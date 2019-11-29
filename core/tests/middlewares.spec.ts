/*eslint-en jest*/
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
    const middleware1 = jest.fn().mockImplementation(next => operation => next(operation))
    const middleware2 = jest.fn().mockImplementation(next => operation => next(operation))
    const cllr = cuillere(middleware1, middleware2)

    await test(cllr)
    await expect(middleware1).toBeCalled
    await expect(middleware2).toBeCalled
  })

  it('should call middlewares in right ordrer', async () => {
    const middleware1: Middleware = next => async operation => 'expected ' + (await next(operation))
    const middleware2: Middleware = next => async operation => 'returned ' + (await next(operation))
    const middleware3: Middleware = () => async () => 'value'

    const cllr = cuillere(middleware1, middleware2, middleware3)

    await test(cllr, 'expected returned value')
  })
})

import cuillere, { Middleware } from '../src'

/*eslint-env jest*/

describe('examples', () => {
  it('promise middleware basic example', async () => {
    // A middleware which handles promises
    const promiseMiddleware: Middleware = function* promiseMiddleware(operation, _ctx, next) {
      if (Promise.resolve(operation) === operation) return operation
      return yield next(operation)
    }

    const cllr = cuillere(promiseMiddleware)

    // Some fake api
    const get = id => Promise.resolve({ id })
    const put = data => Promise.resolve(data)

    function* update(data) {
      const entity = yield get(1)
      return put({ ...entity, ...data })
    }

    const entityToUpdate = { id: 1, test: 'test' }
    const result = await cllr.call(update, entityToUpdate)

    expect(result).toEqual(entityToUpdate)
  })

  it('promise middleware with custom operations', async () => {
    // The operation creator
    const AWAIT_SYMBOL = Symbol('AWAIT')
    const awaitFunc = (func, ...args) => ({ [AWAIT_SYMBOL]: true, func, args })

    // The promise middleware
    const promiseMiddleware: Middleware = function* promiseMiddleware(operation, _ctx, next) {
      if (operation[AWAIT_SYMBOL]) return operation.func(...operation.args)
      return yield next(operation)
    }

    const cllr = cuillere(promiseMiddleware)

    // Some fake api
    const get = id => Promise.resolve({ id })
    const put = data => Promise.resolve(data)

    function* update(data) {
      const entity = yield awaitFunc(get, 1)
      return yield awaitFunc(put, { ...entity, ...data })
    }

    const entityToUpdate = { id: 1, test: 'test' }
    const result = await cllr.call(update, entityToUpdate)

    expect(result).toEqual(entityToUpdate)
  })
})

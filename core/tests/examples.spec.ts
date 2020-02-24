import cuillere, { Middleware, delegate } from '../src'

describe('examples', () => {
  it('promise middleware basic example', async () => {
    // A middleware which handles promises
    const promiseMiddleware: Middleware = function* promiseMiddleware(operation) {
      if (Promise.resolve(operation) !== operation) yield delegate(operation)
      return operation
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
    const promiseMiddleware: Middleware = function* promiseMiddleware(operation) {
      if (!operation[AWAIT_SYMBOL]) yield delegate(operation)
      return operation.func(...operation.args)
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

import { Middleware, makeRunner, call } from '../src'

/*eslint-env jest*/

describe('examples', () => {
  it('promise middleware basic example', async () => {
    // A middleware which handles promises
    const promiseMiddleware: Middleware = next => async operation => {
      if (Promise.resolve(operation) === operation) return operation
      return next(operation)
    }

    const run = makeRunner(promiseMiddleware)()

    // Some fake api
    const get = id => Promise.resolve({ id })
    const put = data => Promise.resolve(data)

    function* update(data) {
      const entity = yield get(1)
      return put({ ...entity, ...data })
    }

    const entityToUpdate = { id: 1, test: 'test' }
    const result = await run(call(update, entityToUpdate))

    expect(result).toEqual(entityToUpdate)
  })

  it('promise middleware with custom operations', async () => {
    // The operation creator
    const AWAIT_SYMBOL = Symbol('AWAIT')
    const awaitFunc = (func, ...args) => ({ [AWAIT_SYMBOL]: true, func, args })

    // The promise middleware
    const promiseMiddleware: Middleware = next => async operation => {
      if (operation[AWAIT_SYMBOL]) return operation.func(...operation.args)
      return next(operation)
    }

    const run = makeRunner(promiseMiddleware)()

    // Some fake api
    const get = id => Promise.resolve({ id })
    const put = data => Promise.resolve(data)

    function* update(data) {
      const entity = yield awaitFunc(get, 1)
      return yield awaitFunc(put, { ...entity, ...data })
    }

    const entityToUpdate = { id: 1, test: 'test' }
    const result = await run(call(update, entityToUpdate))

    expect(result).toEqual(entityToUpdate)
  })
})

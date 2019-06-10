import { Middleware, makeRunner, call } from '../src'

/*eslint-env jest*/

describe('examples', () => {
  it('should run a basic example', async () => {
    // A middleware which handles promises
    const promiseMiddleware: Middleware = next => async (operation, ctx) => {
      if (Promise.resolve(operation) === operation) return operation
      return next(operation, ctx)
    }

    const run = makeRunner(promiseMiddleware)

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
})

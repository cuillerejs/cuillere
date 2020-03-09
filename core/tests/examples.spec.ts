import cuillere, { Middleware } from '../src'

describe('examples', () => {
  it('promise middleware with custom operations', async () => {
    const awaitFunc = (func, ...args: any[]) => ({ kind: 'await', func, args })

    // The promise middleware
    const promiseMiddleware: Middleware = {
      async* await(operation: any) {
        return operation.func(...operation.args)
      },
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

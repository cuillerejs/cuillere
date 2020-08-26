import cuillere, { get, next } from '..'

describe('start', () => {
  it('should call start handler once at startup', async () => {
    await expect(cuillere({
      handlers: {
        * '@cuillere/core/start'(operation, ctx) {
          ctx.value = 'started'
          return yield next(operation)
        },
      },
    }).call(function* test() {
      return yield get('value')
    })).resolves.toBe('started')
  })
})

import cuillere, { get, delegate } from '..'

describe('start', () => {
  it('should call start handler once at startup', async () => {
    await expect(cuillere({
      handlers: {
        * '@cuillere/core/start'(operation, ctx) {
          ctx.value = 'started'
          yield delegate(operation)
        },
      },
    }).call(function* test() {
      return yield get('value')
    })).resolves.toBe('started')
  })
})

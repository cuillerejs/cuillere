import cuillere, { defer, recover } from '..'

describe('recover', () => {
  it('should recover from error', async () => {
    function* test() {
      yield throwAndRecover()

      return 'ok'
    }

    function* throwAndRecover() {
      yield defer(function* () {
        yield recover()
      }())

      throw new TypeError('test')
    }

    await expect(cuillere().call(test)).resolves.toBe('ok')
  })
})

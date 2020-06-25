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

  it('should return the recovered error', async () => {
    const error = new TypeError('test')
    let recovered: any

    function* throwAndRecover() {
      yield defer(function* () {
        recovered = yield recover()
      }())

      throw error
    }

    await cuillere().call(throwAndRecover)
    expect(recovered).toBe(error)
  })
})

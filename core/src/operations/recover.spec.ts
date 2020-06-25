import cuillere, { defer, recover } from '..'

describe('recover', () => {
  it('should recover from error', async () => {
    const error = new Error('test')
    let recovered: any

    function* test() {
      yield throwAndRecover()

      return 'ok'
    }

    function* throwAndRecover() {
      yield defer(function* () {
        recovered = yield recover()
      }())

      throw error
    }

    await expect(cuillere().call(test)).resolves.toBe('ok')
    expect(recovered).toBe(error)
  })

  it('should recover from error in previous defer', async () => {
    function* test() {
      yield defer(function* () {
        yield recover()
      }())
      yield defer(function* () {
        throw new Error('test')
      }())
    }

    await cuillere().call(test)
  })
})

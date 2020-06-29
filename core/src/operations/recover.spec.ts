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
    const error = new Error('test')
    let recovered: any

    function* test() {
      yield defer(function* () {
        recovered = yield recover()
      }())
      yield defer(function* () {
        throw error
      }())
    }

    await expect(cuillere().call(test)).resolves.toBeUndefined()
    expect(recovered).toBe(error)
  })

  it('should recover from error in previous nested defer', async () => {
    const error = new Error('test')
    let recovered: any

    function* test() {
      yield defer(function* () {
        recovered = yield recover()
      }())
      yield defer(function* () {
        yield defer(function* () {
          throw error
        }())
      }())
    }

    await expect(cuillere().call(test)).resolves.toBeUndefined()
    expect(recovered).toBe(error)
  })

  it('should recover error from defer replacing error from function', async () => {
    const error = new Error('test')
    let recovered: any

    function* test() {
      yield defer(function* () {
        recovered = yield recover()
      }())
      yield defer(function* () {
        throw error
      }())
      throw new Error('replaced')
    }

    await expect(cuillere().call(test)).resolves.toBeUndefined()
    expect(recovered).toBe(error)
  })

  it('should keep returned value after recovering error from defer', async () => {
    const error = new Error('test')
    let recovered: any

    function* test() {
      yield defer(function* () {
        recovered = yield recover()
      }())
      yield defer(function* () {
        throw error
      }())
      return 'kept'
    }

    await expect(cuillere().call(test)).resolves.toBe('kept')
    expect(recovered).toBe(error)
  })

  it('should return undefined outside of defer', async () => {
    function* test() {
      return yield recover()
    }

    await expect(cuillere().call(test)).resolves.toBeUndefined()
  })

  it('should return undefined when no error is recovered', async () => {
    let recovered: any

    function* test() {
      yield defer(function* () {
        recovered = yield recover()
      })
    }

    await expect(cuillere().call(test)).resolves.toBeUndefined()
    expect(recovered).toBeUndefined()
  })
})

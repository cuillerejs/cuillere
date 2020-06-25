import cuillere, { Cuillere, call, defer } from '..'

describe('defer', () => {
  let cllr: Cuillere
  let defers: number[]

  beforeEach(() => {
    cllr = cuillere()
    defers = []
  })

  function* push(n: number) {
    defers.push(n)
  }

  it('should execute defers in reversed order', async () => {
    function* test() {
      yield defer(push(3))
      yield defer(push(2))
      yield defer(push(1))
      return 4
    }

    await expect(cllr.call(test)).resolves.toBe(4)
    expect(defers).toEqual([1, 2, 3])
  })

  it('should handle different kind of arguments', async () => {
    function* test() {
      yield defer(push(3))
      yield defer(push, 2)
      yield defer(call(push, 1))
      return 4
    }

    await expect(cllr.call(test)).resolves.toBe(4)
    expect(defers).toEqual([1, 2, 3])
  })

  it('should execute defers after uncaught exception', async () => {
    const error = new Error('foo')

    function* test() {
      yield defer(push(3))
      yield defer(push(2))
      yield defer(push(1))
      throw error
    }

    await expect(cllr.call(test)).rejects.toBe(error)
    expect(defers).toEqual([1, 2, 3])
  })

  it('should be executed after uncaught exception in defer', async () => {
    const error = new Error('test')

    function* test() {
      yield defer(push(2))
      yield defer(function* () {
        throw error
      }())
      yield defer(push(1))
    }

    await expect(cllr.call(test)).rejects.toBe(error)

    expect(defers).toEqual([1, 2])
  })

  it('should replace error by error from defer', async () => {
    const error = new Error('bar')

    function* test() {
      yield defer(function* () {
        throw error
      }())
      throw new Error('foo')
    }

    await expect(cllr.call(test)).rejects.toBe(error)
  })

  it('should throw error from nested defer', async () => {
    const error = new Error('bar')

    function* test() {
      yield defer(function* () {
        yield defer(function* () {
          throw error
        }())
      }())
    }

    await expect(cllr.call(test)).rejects.toBe(error)
  })
})

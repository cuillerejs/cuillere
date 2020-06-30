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
    }

    await expect(cllr.call(test)).resolves.toBeUndefined()
    expect(defers).toEqual([1, 2, 3])
  })

  it('should handle different kind of arguments', async () => {
    function* test() {
      yield defer(push(3))
      yield defer(push, 2)
      yield defer(call(push, 1))
    }

    await expect(cllr.call(test)).resolves.toBeUndefined()
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

  it('should execute nested defers in right order', async () => {
    function* test() {
      yield push(1)

      yield defer(push(15))

      yield defer(function* () {
        yield defer(push(14))

        yield push(13)
      }())

      yield defer(function* () {
        yield defer(push(12))

        yield push(3)

        yield defer(function* () {
          yield defer(push(11))
          yield defer(push(10))

          yield push(9)
        }())

        yield push(4)

        yield defer(function* () {
          yield push(6)

          yield defer(push(8))
          yield defer(push(7))
        }())

        yield push(5)
      }())

      yield push(2)
    }

    await expect(cllr.call(test)).resolves.toBeUndefined()
    expect(defers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  })
})

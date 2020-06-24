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

  function* throwError(message: string) {
    throw new Error(message)
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
    function* test() {
      yield defer(push(3))
      yield defer(push(2))
      yield defer(push(1))
      throw new Error('foo')
    }

    const res = cllr.call(test)

    await expect(res).rejects.toBeInstanceOf(Error)
    await expect(res).rejects.toHaveProperty('message', 'foo')
    expect(defers).toEqual([1, 2, 3])
  })

  it('should be executed after uncaught exception in defer', async () => {
    function* test() {
      yield defer(push(2))
      yield defer(throwError, 'foo')
      yield defer(push(1))
      return 4
    }

    const res = cllr.call(test)

    await expect(res).rejects.toBeInstanceOf(Error)
    await expect(res).rejects.toHaveProperty('message', 'foo')
    expect(defers).toEqual([1, 2])
  })

  it('should throw error from defer', async () => {
    function* test() {
      yield defer(push(2))
      yield defer(throwError, 'bar')
      yield defer(push(1))
      throw new Error('foo')
    }

    const res = cllr.call(test)

    await expect(res).rejects.toBeInstanceOf(Error)
    await expect(res).rejects.toHaveProperty('message', 'bar')
    expect(defers).toEqual([1, 2])
  })
})

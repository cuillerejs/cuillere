import cuillere, { Cuillere } from '.'

describe('stacktrace', () => {
  let cllr: Cuillere

  beforeEach(() => {
    cllr = cuillere()
  })

  it('should have no .next() frames', async () => {
    function* test() {
      throw new TypeError('test')
    }

    let stack: string[]
    try {
      await cllr.call(test)
    } catch (e) {
      stack = e.stack.split('\n')
    }

    expect(stack[0]).toBe('TypeError: test')
    expect(stack[1]).toMatch(/^ +at test \(.+\)$/)
    expect(stack[2]).toMatch(/^ +at Stack.execute \(.+\)$/)
  })

  it('should have named frame for call operation', async () => {
    function* test() {
      yield throwTypeError()
    }

    function* throwTypeError() {
      throw new TypeError('test')
    }

    let stack: string[]
    try {
      await cllr.call(test)
    } catch (e) {
      stack = e.stack.split('\n')
    }

    expect(stack[0]).toBe('TypeError: test')
    expect(stack[1]).toMatch(/^ +at throwTypeError \(.+\)$/)
    expect(stack[2]).toBe('    at test (<anonymous>:0:0)')
    expect(stack[3]).toMatch(/^ +at Stack.execute \(.+\)$/)
  })

  it('should have anonymous frame for generator', async () => {
    function* test() {
      yield throwTypeError()
    }

    function* throwTypeError() {
      throw new TypeError('test')
    }

    let stack: string[]
    try {
      await cllr.start(test())
    } catch (e) {
      stack = e.stack.split('\n')
    }

    expect(stack[0]).toBe('TypeError: test')
    expect(stack[1]).toMatch(/^ +at throwTypeError \(.+\)$/)
    expect(stack[2]).toBe('    at <anonymous generator> (<anonymous>:0:0)')
    expect(stack[3]).toMatch(/^ +at Stack.execute \(.+\)$/)
  })
})

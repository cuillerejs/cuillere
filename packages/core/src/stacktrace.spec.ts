import { describe, beforeEach, it, expect } from 'vitest'

import { Cuillere, Effect, cuillere } from '.'

describe('stacktrace', () => {
  let cllr: Cuillere

  beforeEach(() => {
    cllr = cuillere()
  })

  it('should have no .next() frames', async () => {
    function* test() {
      throw new TypeError('test')
    }

    let stack: string[] = []
    try {
      await cllr.call(test)
    } catch (e) {
      stack = e.stack.split('\n')
    }

    expect(stack[0]).toBe('TypeError: test')
    expect(stack[1]).toMatch(/^ +at test \(.+\/stacktrace\.spec\.ts:.+\)$/)
    expect(stack[2]).toMatch(/^ +at Stack.execute \(.+\)$/)
  })

  it('should have named frame for call operation', async () => {
    function* test() {
      yield throwTypeError()
    }

    function* throwTypeError() {
      throw new TypeError('test')
    }

    let stack: string[] = []
    try {
      await cllr.call(test)
    } catch (e) {
      stack = e.stack.split('\n')
    }

    expect(stack[0]).toBe('TypeError: test')
    expect(stack[1]).toMatch(/^ +at throwTypeError \(.+\/stacktrace\.spec\.ts:.+\)$/)
    expect(stack[2]).toBe('    at test (<unknown>)')
    expect(stack[3]).toMatch(/^ +at Stack.execute \(.+\)$/)
  })

  it('should have anonymous frame for generator', async () => {
    function* test() {
      yield throwTypeError()
    }

    function* throwTypeError() {
      throw new TypeError('test')
    }

    let stack: string[] = []
    try {
      await cllr.execute(test())
    } catch (e) {
      stack = e.stack.split('\n')
    }

    expect(stack[0]).toBe('TypeError: test')
    expect(stack[1]).toMatch(/^ +at throwTypeError \(.+\/stacktrace\.spec\.ts:.+\)$/)
    expect(stack[2]).toBe('    at <anonymous generator> (<unknown>)')
    expect(stack[3]).toMatch(/^ +at Stack.execute \(.+\)$/)
  })

  it('should have yield frame for handler', async () => {
    const cllr = cuillere({
      namespace: '@cuillere/test',
      handlers: {
        * test() {
          yield throwTypeError()
        },
      },
    })

    function* test() {
      yield { kind: '@cuillere/test/test' as const }
    }

    function* throwTypeError() {
      throw new TypeError('test')
    }

    let stack: string[] = []
    try {
      await cllr.call(test)
    } catch (e) {
      stack = e.stack.split('\n')
    }

    expect(stack[0]).toBe('TypeError: test')
    expect(stack[1]).toMatch(/^ +at throwTypeError \(.+\/stacktrace\.spec\.ts:.+\)$/)
    expect(stack[2]).toBe('    at <yield @cuillere/test/test> (<unknown>)')
    expect(stack[3]).toBe('    at test (<unknown>)')
    expect(stack[4]).toMatch(/^ +at Stack.execute \(.+\)$/)
  })

  it('should have top yield frame for handler', async () => {
    const cllr = cuillere({
      namespace: '@cuillere/test',
      handlers: {
        * test() {
          throw new TypeError('test')
        },
      },
    })

    function* test() {
      yield { kind: '@cuillere/test/test' as const }
    }

    let stack: string[] = []
    try {
      await cllr.call(test)
    } catch (e) {
      stack = e.stack.split('\n')
    }

    expect(stack[0]).toBe('TypeError: test')
    expect(stack[1]).toMatch(/^ +at <yield @cuillere\/test\/test> \(.+\/stacktrace\.spec\.ts:.+\)$/)
    expect(stack[2]).toBe('    at test (<unknown>)')
    expect(stack[3]).toMatch(/^ +at Stack.execute \(.+\)$/)
  })

  it('should capture stack for core errors', async () => {
    function* test() {
      yield yieldNull()
    }

    function* yieldNull() {
      yield null
    }

    let stack: string[] = []
    try {
      await cllr.call(test)
    } catch (e) {
      stack = e.stack.split('\n')
    }

    expect(stack[0]).toBe('TypeError: null effect is forbidden')
    expect(stack[1]).toMatch(/^ +at Stack.validateEffect \(.+\)$/)
    expect(stack[2]).toMatch(/^ +at Stack.handle \(.+\)$/)
    expect(stack[3]).toBe('    at <anonymous generator> (<unknown>)')
    expect(stack[4]).toBe('    at test (<unknown>)')
    expect(stack[5]).toMatch(/^ +at Stack.execute \(.+\)$/)
  })

  it('should not capture stack for start errors', async () => {
    let stack: string[] = []
    try {
      await cllr.execute(null)
    } catch (e) {
      stack = e.stack.split('\n')
    }

    expect(stack[0]).toBe('TypeError: null effect is forbidden')
    expect(stack[1]).toMatch(/^ +at Stack.validateEffect \(.+\)$/)
    expect(stack[2]).toMatch(/^ +at Stack.handle \(.+\)$/)
    expect(stack[3]).toMatch(/^ +at Stack.start \(.+\)$/)
  })
})

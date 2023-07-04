import { describe, expect, it, vi } from 'vitest'

import { Cuillere, Plugin, cuillere, next } from '.'

describe('plugin', () => {
  const callFuncAndExpectTest = async (cllr: Cuillere, expected = 'test') => {
    function* func() {
      return 'test'
    }
    expect(await cllr.call(func)).toBe(expected)
  }

  it('should work with no plugins', async () => {
    await callFuncAndExpectTest(cuillere())
  })

  it('should call plugins for call operation', async () => {
    const plugin1Fn = vi.fn()
    const plugin1: Plugin = {
      handlers: {
        * '@cuillere/core/call'() {
          plugin1Fn()
          return yield next()
        },
      },
    }

    const plugin2Fn = vi.fn()
    const plugin2: Plugin = {
      handlers: {
        * '@cuillere/core/call'() {
          plugin2Fn()
          return yield next()
        },
      },
    }

    await callFuncAndExpectTest(cuillere(plugin1, plugin2))
    expect(plugin1Fn).toHaveBeenCalled()
    expect(plugin2Fn).toHaveBeenCalled()
  })

  it('should be able to catch exception from plugin (https://bugs.chromium.org/p/v8/issues/detail?id=10238)', async () => {
    const error = new Error('test')
    let catched: Error | null = null

    async function* test() {
      try {
        yield { kind: '@cuillere/test/throw' as const }
      } catch (e) {
        catched = e
      }
    }

    const plugin: Plugin = {
      namespace: '@cuillere/test',
      handlers: {
        async* throw() {
          throw error
        },
      },
    }

    await expect(cuillere(plugin).call(test)).resolves.toBeUndefined()
    expect(catched).toBe(error)
  })

  it('should not allow unqualified handlers on plugins w/o namespace', () => {
    let catched: any
    try {
      cuillere({
        handlers: {
          * test() {
            // unqualified handler
          },
        },
      })
    } catch (e) {
      catched = e
    }

    expect(catched).toStrictEqual(TypeError('Plugin without namespace must have only qualified handlers, found "test"'))
  })

  it('should not allow validators on plugins w/o namespace', () => {
    let catched: any
    try {
      cuillere({
        handlers: {},
        validators: {
          test() {
            // validator
          },
        },
      })
    } catch (e) {
      catched = e
    }

    expect(catched).toStrictEqual(TypeError('Plugin without namespace must not have validators'))
  })

  it('should not allow qualified validators', () => {
    let catched: any
    try {
      cuillere({
        namespace: '@cuillere/test',
        handlers: {},
        validators: {
          '@cuillere/core/call'() {
            // validator
          },
        },
      })
    } catch (e) {
      catched = e
    }

    expect(catched).toStrictEqual(TypeError('Qualified validators are forbidden, found "@cuillere/core/call"'))
  })
})

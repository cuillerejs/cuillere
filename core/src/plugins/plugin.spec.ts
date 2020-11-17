import cuillere, { Cuillere, Plugin, next } from '..'

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
    const plugin1Fn = jest.fn()
    const plugin1: Plugin = {
      handlers: {
        * '@cuillere/core/call'(operation) {
          plugin1Fn()
          return yield next(operation)
        },
      },
    }

    const plugin2Fn = jest.fn()
    const plugin2: Plugin = {
      handlers: {
        * '@cuillere/core/call'(operation) {
          plugin2Fn()
          return yield next(operation)
        },
      },
    }

    await callFuncAndExpectTest(cuillere(plugin1, plugin2))
    expect(plugin1Fn).toBeCalled()
    expect(plugin2Fn).toBeCalled()
  })

  it('should be able to catch exception from plugin (https://bugs.chromium.org/p/v8/issues/detail?id=10238)', async () => {
    const error = new Error('test')
    let catched: Error

    async function* test() {
      try {
        yield { kind: '@cuillere/test/throw' }
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

import cuillere, { Cuillere, Plugin, next } from '..'

describe('plugin', () => {
  const test = async (cllr: Cuillere, expected = 'test') => {
    function* func() {
      return 'test'
    }
    expect(await cllr.call(func)).toBe(expected)
  }

  it('should work with no plugins', async () => {
    const cllr = cuillere()
    await test(cllr)
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
      namespace: '@cuillere/test',

      handlers: {
        * '@cuillere/core/call'(operation) {
          plugin2Fn()
          return yield next(operation)
        },
      },
    }

    const cllr = cuillere(plugin1, plugin2)

    await test(cllr)
    expect(plugin1Fn).toBeCalled()
    expect(plugin2Fn).toBeCalled()
  })

  it('should call plugins in right ordrer', async () => {
    const plugin1: Plugin = {
      handlers: {
        * '@cuillere/core/call'(operation) {
          return `expected ${yield next(operation)}`
        },
      },
    }
    const plugin2: Plugin = {
      handlers: {
        * '@cuillere/core/call'(operation) {
          return `returned ${yield next(operation)}`
        },
      },
    }
    const plugin3: Plugin = {
      namespace: '@cuillere/test1',

      handlers: {
        * '@cuillere/core/call'() {
          return 'value'
        },
      },
    }

    const cllr = cuillere(plugin1, plugin2, plugin3)

    await test(cllr, 'expected returned value')
  })

  // SKIPPED: waiting for node bug resolution : https://github.com/nodejs/node/issues/31867
  it.skip('should be able to catch exception from plugin', async () => {
    const throwOperation = () => ({ kind: '@cuillere/test/throw' })
    const error = new Error('test')
    let catched: Error

    async function* test() {
      try {
        yield throwOperation()
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
})

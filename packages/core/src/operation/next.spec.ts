import { Plugin, cuillere, delegate, next } from '..'

describe('next', () => {
  it('should not be allowed outside handlers', async () => {
    let catched: Error

    function* test() {
      try {
        yield next({ kind: 'test' })
      } catch (e) {
        catched = e
      }
    }

    await cuillere().call(test)
    expect(catched).toStrictEqual(new TypeError('next: should be used only in handlers'))
  })

  it('should not allow to change operation kind', async () => {
    let catched: Error

    await cuillere(
      { handlers: {
        * '@cuillere/test/test'() {
          try {
            yield next({ kind: '@cuillere/test/test2' })
          } catch (e) {
            catched = e
          }
        },
      } },
    ).start({ kind: '@cuillere/test/test' })

    expect(catched).toStrictEqual(new TypeError('next: operation kind mismatch, expected "@cuillere/test/test", received "@cuillere/test/test2"'))
  })

  it('should call handlers in right ordrer', async () => {
    const plugin1: Plugin = {
      handlers: {
        * '@cuillere/test/test'(operation) {
          return `1 ${yield next(operation)}`
        },
      },
    }
    const plugin2: Plugin = {
      handlers: {
        * '@cuillere/test/test'(operation) {
          return `2 ${yield next(operation)}`
        },
      },
    }
    const plugin3: Plugin = {
      handlers: {
        * '@cuillere/test/test'() {
          return '3'
        },
      },
    }

    await expect(cuillere(plugin1, plugin2, plugin3).start({ kind: '@cuillere/test/test' })).resolves.toBe('1 2 3')
  })

  it('should delegate to next handler', async () => {
    const plugin1: Plugin = {
      handlers: {
        * '@cuillere/test/test'(operation) {
          yield delegate(operation)
          return 'should not be reached'
        },
      },
    }
    const plugin2: Plugin = {
      handlers: {
        * '@cuillere/test/test'() {
          return 2
        },
      },
    }

    await expect(cuillere(plugin1, plugin2).start({ kind: '@cuillere/test/test' })).resolves.toBe(2)
  })
})

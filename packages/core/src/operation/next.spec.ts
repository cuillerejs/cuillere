import { describe, it, expect } from 'vitest'

import { Operation, Plugin, cuillere, delegate, next } from '..'

describe('next', () => {
  it('should not be allowed outside handlers', async () => {
    let catched: Error | null = null

    function* test() {
      try {
        yield next({ kind: '@cuillere/test/test' })
      } catch (e) {
        catched = e
      }
    }

    await cuillere().call(test)
    expect(catched).toStrictEqual(new TypeError('next: should be used only in handlers'))
  })

  it('should not allow to change operation kind', async () => {
    let catched: Error | null = null

    await cuillere(
      {
        handlers: {
          * '@cuillere/test/test'() {
            try {
              yield next({ kind: '@cuillere/test/test2' })
            } catch (e) {
              catched = e
            }
          },
        },
      },
    ).execute({ kind: '@cuillere/test/test' })

    expect(catched).toStrictEqual(new TypeError('next: effect kind mismatch, expected "@cuillere/test/test", received "@cuillere/test/test2"'))
  })

  it('should call handlers in right ordrer', async () => {
    interface TestOperation extends Operation {
      value: any
    }

    const plugin1: Plugin = {
      handlers: {
        * '@cuillere/test/test'() {
          return `1 ${yield next({ kind: '@cuillere/test/test', value: 'modified' })}`
        },
      },
    }
    const plugin2: Plugin = {
      handlers: {
        * '@cuillere/test/test'() {
          return `2 ${yield next()}`
        },
      },
    }
    const plugin3: Plugin<{ '@cuillere/test/test': TestOperation }> = {
      handlers: {
        * '@cuillere/test/test'(operation) {
          return `3 ${operation.value}`
        },
      },
    }

    await expect(
      cuillere(plugin1, plugin2, plugin3)
        .execute({ kind: '@cuillere/test/test', value: 'original' } as TestOperation),
    ).resolves.toBe('1 2 3 modified')
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

    await expect(cuillere(plugin1, plugin2).execute({ kind: '@cuillere/test/test' })).resolves.toBe(2)
  })
})

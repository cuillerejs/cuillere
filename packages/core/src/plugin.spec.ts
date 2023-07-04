import { describe, expect, it } from 'vitest'

import { Cuillere, Plugin, cuillere } from '.'

describe('plugin', () => {
  const callFuncAndExpectTest = async (cllr: Cuillere, expected = 'test') => {
    function* func() {
      return 'test'
    }
    await expect(cllr.run(func())).resolves.toBe(expected)
  }

  it('should work with no plugins', async () => {
    await callFuncAndExpectTest(cuillere())
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
        async throw() {
          throw error
        },
      },
    }

    await expect(cuillere(plugin).run(test())).resolves.toBeUndefined()
    expect(catched).toBe(error)
  })
})

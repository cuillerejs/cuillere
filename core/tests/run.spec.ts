/* eslint-env jest */
/* eslint-disable require-yield */

import cuillere, { Cuillere, call } from '../src'

describe('run', () => {
  let cllr: Cuillere
  beforeEach(() => {
    cllr = cuillere()
  })

  describe('runCallOperation', () => {
    it('should return the result of a simple generator function', async () => {
      function* test() {
        return 'test'
      }

      expect(await cllr.execute(test)).toBe('test')
    })

    it('should pass arguments to the generator function', async () => {
      function* test(...args) {
        return args
      }
      const testArgs = [1, 2, 3, 4]

      expect(await cllr.execute(test, ...testArgs)).toEqual(testArgs)
    })

    it('should run yielded operations', async () => {
      function* test1() {
        return 'test1'
      }

      function* test2() {
        return 'test2'
      }

      function* test3() {
        const result1 = yield call(test1)
        const result2 = yield call(test2)
        return [result1, result2]
      }

      expect(await cllr.execute(test3)).toEqual(['test1', 'test2'])
    })
  })
})

/* eslint-env jest */
/* eslint-disable require-yield */

import { makeRunner, call } from '../src'

describe('run', () => {
  let run: Function
  beforeEach(() => {
    run = makeRunner()()
  })

  describe('runCallOperation', () => {
    it('should return the result of a simple generator function', async () => {
      function* test() {
        return 'test'
      }

      expect(await run(call(test))).toBe('test')
    })

    it('should pass arguments to the generator function', async () => {
      function* test(...args) {
        return args
      }
      const testArgs = [1, 2, 3, 4]

      expect(await run(call(test, ...testArgs))).toEqual(testArgs)
    })

    it('should run returned operations', async () => {
      function* test1() {
        return 'test'
      }

      function* test2() {
        return call(test1)
      }

      expect(await run(call(test2))).toBe('test')
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

      expect(await run(call(test3))).toEqual(['test1', 'test2'])
    })
  })
})

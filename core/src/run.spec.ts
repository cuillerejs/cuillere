import cuillere, { Cuillere, call } from '.'

describe('run', () => {
  let cllr: Cuillere
  beforeEach(() => {
    cllr = cuillere()
  })

  describe('runCallOperation', () => {
    it('should return the result of a simple generator function (using call)', async () => {
      function* test() {
        return 'test'
      }

      expect(await cllr.call(test)).toBe('test')
    })

    it('should return the result of a simple generator (using start)', async () => {
      function* test() {
        return 'test'
      }

      expect(await cllr.start(test())).toBe('test')
    })

    it('should pass arguments to the generator function', async () => {
      function* test(...args) {
        return args
      }
      const testArgs = [1, 2, 3, 4]

      expect(await cllr.call(test, ...testArgs)).toEqual(testArgs)
    })

    it('should run yielded call operations', async () => {
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

      expect(await cllr.call(test3)).toEqual(['test1', 'test2'])
    })

    it('should run yielded generators', async () => {
      function* test1() {
        return 'test1'
      }

      function* test2() {
        return 'test2'
      }

      function* test3() {
        const result1 = yield test1()
        const result2 = yield test2()
        return [result1, result2]
      }

      expect(await cllr.call(test3)).toEqual(['test1', 'test2'])
    })

    it('should throw error for undefined start operation', async () => {
      await expect(cllr.start(undefined))
        .rejects.toStrictEqual(new TypeError('undefined operation is forbidden'))
    })

    it('should throw error for undefined operation', async () => {
      await expect(cllr.call(function* () { yield undefined }))
        .rejects.toStrictEqual(new TypeError('undefined operation is forbidden'))
    })

    it('should throw error for undefined wrapped operation', async () => {
      await expect(cllr.call(function* () { yield { kind: 'test', operation: undefined } }))
        .rejects.toStrictEqual(new TypeError('undefined operation is forbidden'))
    })

    it('should throw error for null operation', async () => {
      await cllr.call(function* () {
        try {
          yield null
          throw Error('should have thrown error')
        } catch (e) {
          // eslint-disable-next-line jest/no-try-expect
          expect(e).toHaveProperty('message', 'null operation is forbidden')
        }
      })
    })

    it('should throw error from async generator with no yield (bug suspicion)', async () => {
      const error = new Error('test')
      await expect(cllr.call(function* () {
        yield call(async function* () {
          throw error
        })
      })).rejects.toBe(error)
    })
  })
})

import { describe, it, expect, beforeAll, vi } from 'vitest'

import { Runner } from './runner'
import { Cuillere } from './cuillere'

describe('Runner', () => {
  let cllr: Cuillere

  beforeAll(() => {
    cllr = {
      context: vi.fn(),
      run: vi.fn(),
    }
  })

  describe('constructor', () => {
    it('should throw an error if generator is not a generator', () => {
      // @ts-ignore: ts(2637)
      expect(() => new Runner({}, {}, undefined, cllr)).toThrow('undefined value is not a Generator')
      // @ts-ignore: ts(2637)
      expect(() => new Runner({}, {}, null, cllr)).toThrow('object value is not a Generator')
      // @ts-ignore: ts(2637)
      expect(() => new Runner({}, {}, 'test', cllr)).toThrow('string value is not a Generator')
      // @ts-ignore: ts(2637)
      expect(() => new Runner({}, {}, Promise.resolve('test'), cllr)).toThrow('object value is not a Generator')
      // @ts-ignore: ts(2637)
      expect(() => new Runner({}, {}, dummy, cllr)).toThrow('function value is not a Generator')
    })
  })

  describe('handle', () => {
    it('should throw an error if operation is not an operation', async () => {
      const runner = new Runner({}, {}, dummy(), cllr)

      // @ts-ignore: ts(2637)
      await expect(runner.handle(undefined)).rejects.toThrow('undefined value is not an operation')
      // @ts-ignore: ts(2637)
      await expect(runner.handle(null)).rejects.toThrow('object value is not an operation')
      // @ts-ignore: ts(2637)
      await expect(runner.handle(1)).rejects.toThrow('number value is not an operation')
      // @ts-ignore: ts(2637)
      await expect(runner.handle('')).rejects.toThrow('string value is not an operation')
      // @ts-ignore: ts(2637)
      await expect(runner.handle({})).rejects.toThrow('object value is not an operation')
      // @ts-ignore: ts(2637)
      await expect(runner.handle(dummy())).rejects.toThrow('object value is not an operation')
      // @ts-ignore: ts(2637)
      await expect(runner.handle(Symbol('test'))).rejects.toThrow('symbol value is not an operation')
    })

    it('should throw an error if no handler is defined for operation kind', async () => {
      const runner = new Runner({
        '@test/foo'() {
          // empty
        },
      }, {}, dummy(), cllr)

      await expect(runner.handle({ kind: '@test/bar' })).rejects.toThrow('no handler defined for "@test/bar" operation kind')
      await expect(runner.handle({ kind: '@test/baz' })).rejects.toThrow('no handler defined for "@test/baz" operation kind')
    })
  })

  describe('run', () => {
    it('should return the result of a simple generator function', async () => {
      function* test() {
        return 'test'
      }

      const runner = new Runner({}, {}, test(), cllr)

      await expect(runner.run()).resolves.toBe('test')
    })

    it('should run a generator function calling other generator functions', async () => {
      function* test1() {
        return 'test1'
      }

      function* test2() {
        return 'test2'
      }

      function* test3() {
        const result1 = yield* test1()
        const result2 = yield* test2()
        return [result1, result2]
      }

      const runner = new Runner({}, {}, test3(), cllr)

      await expect(runner.run()).resolves.toEqual(['test1', 'test2'])
    })

    it('should throw error from async generator with no yield (bug suspicion)', async () => {
      const error = new Error('test')
      async function* test() {
        yield* (async function* () {
          throw error
        }())
      }

      const runner = new Runner({}, {}, test(), cllr)

      await expect(runner.run()).rejects.toBe(error)
    })
  })
})

function* dummy() {
  // dummy
}

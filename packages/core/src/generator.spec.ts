import { describe, it, expect } from 'vitest'

import { isGeneratorFunction } from './generator'

describe('generator', () => {
  function* gen() { /* test */ }
  async function* asyncGen() { /* test */ }
  function func() { /* test */ }
  async function asyncFunc() { /* test */ }
  function makeGenerator(): Generator {
    return {
      next() { return { value: undefined } },
      return() { return { value: undefined } },
      throw() { return { value: undefined } },
      [Symbol.iterator]() { return this },
    }
  }

  describe('isGeneratorFunction', () => {
    it('should return true for a generator function or async generator function', () => {
      expect(isGeneratorFunction(gen)).toBe(true)
      expect(isGeneratorFunction(asyncGen)).toBe(true)
    })

    it('should return false for non generator values', () => {
      expect(isGeneratorFunction(gen())).toBe(false)
      expect(isGeneratorFunction(asyncGen())).toBe(false)
      expect(isGeneratorFunction(func)).toBe(false)
      expect(isGeneratorFunction(asyncFunc)).toBe(false)
      expect(isGeneratorFunction(makeGenerator)).toBe(false)
      expect(isGeneratorFunction(makeGenerator())).toBe(false)
      expect(isGeneratorFunction([][Symbol.iterator]())).toBe(false)
      expect(isGeneratorFunction(Promise.resolve())).toBe(false)
      expect(isGeneratorFunction(1)).toBe(false)
      expect(isGeneratorFunction('test')).toBe(false)
      expect(isGeneratorFunction([])).toBe(false)
      expect(isGeneratorFunction({})).toBe(false)
      expect(isGeneratorFunction(true)).toBe(false)
      expect(isGeneratorFunction(false)).toBe(false)
      expect(isGeneratorFunction(undefined)).toBe(false)
      expect(isGeneratorFunction(null)).toBe(false)
    })
  })
})

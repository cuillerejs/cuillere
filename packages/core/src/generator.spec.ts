import { isGenerator, isGeneratorFunction, isGeneratorLike } from './generator'

describe('generator', () => {
  function* gen() { /* test */ }
  async function* asyncGen() { /* test */ }
  function func() { /* test */ }
  async function asyncFunc() { /* test */ }
  function makeGenerator(): Generator {
    return {
      next() { return undefined },
      return() { return undefined },
      throw() { return undefined },
      [Symbol.iterator]() { return this },
    }
  }

  describe('isGeneratorLike', () => {
    it('should return true for generator-like values', () => {
      expect(isGeneratorLike(gen())).toBe(true)
      expect(isGeneratorLike(asyncGen())).toBe(true)
      expect(isGeneratorLike(makeGenerator())).toBe(true)
    })

    it('should return false for non generator-like values', () => {
      expect(isGeneratorLike(gen)).toBe(false)
      expect(isGeneratorLike(asyncGen)).toBe(false)
      expect(isGeneratorLike(func)).toBe(false)
      expect(isGeneratorLike(asyncFunc)).toBe(false)
      expect(isGeneratorLike(makeGenerator)).toBe(false)
      expect(isGeneratorLike([][Symbol.iterator]())).toBe(false)
      expect(isGeneratorLike(Promise.resolve())).toBe(false)
      expect(isGeneratorLike(1)).toBe(false)
      expect(isGeneratorLike('test')).toBe(false)
      expect(isGeneratorLike([])).toBe(false)
      expect(isGeneratorLike({})).toBe(false)
      expect(isGeneratorLike(true)).toBe(false)
      expect(isGeneratorLike(false)).toBe(false)
      expect(isGeneratorLike(undefined)).toBe(false)
      expect(isGeneratorLike(null)).toBe(false)
    })
  })

  describe('isGenerator', () => {
    it('should return true for a generator or async generator', () => {
      expect(isGenerator(gen())).toBe(true)
      expect(isGenerator(asyncGen())).toBe(true)
    })

    it('should return false for non generator values', () => {
      expect(isGenerator(gen)).toBe(false)
      expect(isGenerator(asyncGen)).toBe(false)
      expect(isGenerator(func)).toBe(false)
      expect(isGenerator(asyncFunc)).toBe(false)
      expect(isGenerator(makeGenerator)).toBe(false)
      expect(isGenerator(makeGenerator())).toBe(false)
      expect(isGenerator([][Symbol.iterator]())).toBe(false)
      expect(isGenerator(Promise.resolve())).toBe(false)
      expect(isGenerator(1)).toBe(false)
      expect(isGenerator('test')).toBe(false)
      expect(isGenerator([])).toBe(false)
      expect(isGenerator({})).toBe(false)
      expect(isGenerator(true)).toBe(false)
      expect(isGenerator(false)).toBe(false)
      expect(isGenerator(undefined)).toBe(false)
      expect(isGenerator(null)).toBe(false)
    })
  })

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

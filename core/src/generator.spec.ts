import { isGenerator, isGeneratorFunction } from './generator'

describe('generator', () => {
  function* gen() { /* test */ }
  async function* asyncGen() { /* test */ }

  describe('isGenerator', () => {
    it('should return true for a generator or async generator', () => {
      expect(isGenerator(gen())).toBe(true)
      expect(isGenerator(asyncGen())).toBe(true)
    })

    it('should return false for non generator values', () => {
      expect(isGenerator(gen)).toBe(false)
      expect(isGenerator(asyncGen)).toBe(false)
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

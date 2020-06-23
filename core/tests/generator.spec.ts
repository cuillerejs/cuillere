import { isGenerator } from '../src/generator'

describe('generator', () => {
  describe('isGenerator', () => {
    it('should return true for a generator', () => {
      function* test() {
        return true
      }

      expect(isGenerator(test())).toBe(true)
    })

    it('should return false for non generator values', () => {
      expect(isGenerator(Promise.resolve())).toBe(false)
      expect(isGenerator(1)).toBe(false)
      expect(isGenerator('test')).toBe(false)
      expect(isGenerator([])).toBe(false)
      expect(isGenerator({})).toBe(false)
      expect(isGenerator(true)).toBe(false)
      expect(isGenerator(false)).toBe(false)
    })
  })
})

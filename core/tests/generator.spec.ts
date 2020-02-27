import { isGenerator } from '../src/generator'

describe('generator', () => {
  describe('isGenerator', () => {
    it('should return true for a generator', () => {
      function* test() {
        return true
      }

      expect(isGenerator(test())).toBeTruthy()
    })

    it('should return false for non generator values', () => {
      expect(isGenerator(Promise.resolve())).toBeFalsy()
      expect(isGenerator(1)).toBeFalsy()
      expect(isGenerator('test')).toBeFalsy()
      expect(isGenerator([])).toBeFalsy()
      expect(isGenerator({})).toBeFalsy()
      expect(isGenerator(true)).toBeFalsy()
      expect(isGenerator(false)).toBeFalsy()
    })

    it('should handle null and undefined by returning false', () => {
      expect(isGenerator(null)).toBeFalsy()
      expect(isGenerator(undefined)).toBeFalsy()
    })
  })
})

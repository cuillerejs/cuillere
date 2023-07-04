import { describe, it, expect } from 'vitest'

import { cuillere, generator } from '..'

describe('generator', () => {
  it("should return the current frame's generator", async () => {
    function* test() {
      return yield generator()
    }

    const gen = test()

    await expect(cuillere().execute(gen)).resolves.toBe(gen)
  })
})

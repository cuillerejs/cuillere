import cuillere, { next, Cuillere } from '..'

describe('next', () => {
  let cllr: Cuillere

  beforeEach(() => {
    cllr = cuillere()
  })

  it('should not be allowed outside handlers', async () => {
    let catched: Error

    function* test() {
      try {
        yield next({ kind: 'test' })
      } catch (e) {
        catched = e
      }
    }

    await cllr.call(test)
    expect(catched).toStrictEqual(new TypeError('next: should be used only in handlers'))
  })
})

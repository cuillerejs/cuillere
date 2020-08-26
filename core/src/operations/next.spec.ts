import cuillere, { next } from '..'

describe('next', () => {
  it('should not be allowed outside handlers', async () => {
    let catched: Error

    function* test() {
      try {
        yield next({ kind: 'test' })
      } catch (e) {
        catched = e
      }
    }

    await cuillere().call(test)
    expect(catched).toStrictEqual(new TypeError('next: should be used only in handlers'))
  })

  it('should not allow to change operation kind', async () => {
    let catched: Error

    await cuillere(
      { handlers: {
        * '@cuillere/test/test'() {
          try {
            yield next({ kind: '@cuillere/test/test2' })
          } catch (e) {
            catched = e
          }
        },
      } },
    ).start({ kind: '@cuillere/test/test' })

    expect(catched).toStrictEqual(new TypeError('next: operation kind mismatch, expected "@cuillere/test/test", received "@cuillere/test/test2"'))
  })
})

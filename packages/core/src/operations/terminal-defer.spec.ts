import cuillere, { Cuillere, defer, terminal } from '..'

describe('terminal defer', () => {
  let cllr: Cuillere

  beforeEach(() => {
    cllr = cuillere()
  })

  it('should allow to defer in parent frame', async () => {
    const actions: string[] = []

    function* resource(id: number) {
      actions.push(`create resource ${id}`)

      yield terminal(defer(function* cleanupResource() {
        actions.push(`cleanup resource ${id}`)
      }))
    }

    function* test1() {
      yield resource(1)

      actions.push('use resource 1')
    }

    function* test2() {
      yield resource(2)

      actions.push('use resource 2')

      throw new Error()
    }

    await expect(cllr.call(test1)).resolves.toBeUndefined()
    await expect(cllr.call(test2)).rejects.toBeInstanceOf(Error)

    expect(actions).toEqual([
      'create resource 1',
      'use resource 1',
      'cleanup resource 1',
      'create resource 2',
      'use resource 2',
      'cleanup resource 2',
    ])
  })
})

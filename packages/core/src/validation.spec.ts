import { Cuillere, Operation, Plugin, cuillere, defer, fork, recover, terminal } from '.'

describe('validation', () => {
  let cllr: Cuillere

  beforeEach(() => {
    cllr = cuillere()
  })

  function* dummy() {
    // dummy
  }

  it('should throw error for undefined start effect', async () => {
    await expect(cllr.execute(undefined))
      .rejects.toStrictEqual(new TypeError('undefined effect is forbidden'))
  })

  it('should throw error for undefined effect', async () => {
    function* test() {
      yield undefined
    }

    await expect(cllr.call(test))
      .rejects.toStrictEqual(new TypeError('undefined effect is forbidden'))
  })

  it('should throw error for undefined wrapped effect', async () => {
    function* test() {
      yield { kind: '@test' as const, effect: undefined }
    }

    await expect(cllr.call(test))
      .rejects.toStrictEqual(new TypeError('undefined effect is forbidden'))
  })

  it('should throw error for null effect', async () => {
    function* test() {
      yield null
    }

    await expect(cllr.call(test))
      .rejects.toStrictEqual(new TypeError('null effect is forbidden'))
  })

  describe('terminal', () => {
    it('should not accept fork operation', async () => {
      function* test() {
        yield terminal(fork(dummy()))
      }

      await expect(cllr.call(test)).rejects.toStrictEqual(new TypeError('terminal fork is forbidden'))
    })

    it('should not accept defer operation', async () => {
      function* test() {
        yield terminal(defer(dummy()))
      }

      await expect(cllr.call(test)).rejects.toStrictEqual(new TypeError('terminal defer is forbidden'))
    })

    it('should not accept recover operation', async () => {
      function* test() {
        yield terminal(recover())
      }

      await expect(cllr.call(test)).rejects.toStrictEqual(new TypeError('terminal recover is forbidden'))
    })

    it('should not accept terminal operation', async () => {
      function* test() {
        yield terminal(terminal(dummy()) as any)
      }

      await expect(cllr.call(test)).rejects.toStrictEqual(new TypeError('terminals cannot be nested'))
    })
  })

  it('should allow custom validators', async () => {
    const kind = '@cuillere/test/test'
    let catched: any

    interface TestOperation extends Operation {
      answer: number
    }

    function testOperation(answer: number): TestOperation {
      return { kind, answer }
    }

    const testPlugin: Plugin<{ test: TestOperation }> = {
      namespace: '@cuillere/test',
      handlers: {
        * test({ answer }) {
          return answer
        },
      },
      validators: {
        test({ answer }) {
          if (answer !== 42) throw TypeError('answer should be 42')
        },
      },
    }

    await cuillere(testPlugin).call(function* test() {
      yield testOperation(42)
      try {
        yield testOperation(666)
      } catch (e) {
        catched = e
      }
    })

    expect(catched).toStrictEqual(TypeError('answer should be 42'))
  })
})

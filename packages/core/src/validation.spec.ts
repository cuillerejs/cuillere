import cuillere, { Cuillere, fork, Plugin, recover, terminal } from '.'
import { OperationObject } from './operations'

describe('validation', () => {
  let cllr: Cuillere

  beforeEach(() => {
    cllr = cuillere()
  })

  function* dummy() {
    // dummy
  }

  it('should throw error for undefined start operation', async () => {
    await expect(cllr.start(undefined))
      .rejects.toStrictEqual(new TypeError('undefined operation is forbidden'))
  })

  it('should throw error for undefined operation', async () => {
    function* test() {
      yield undefined
    }

    await expect(cllr.call(test))
      .rejects.toStrictEqual(new TypeError('undefined operation is forbidden'))
  })

  it('should throw error for undefined wrapped operation', async () => {
    function* test() {
      yield { kind: 'test', operation: undefined }
    }

    await expect(cllr.call(test))
      .rejects.toStrictEqual(new TypeError('undefined operation is forbidden'))
  })

  it('should throw error for null operation', async () => {
    function* test() {
      yield null
    }

    await expect(cllr.call(test))
      .rejects.toStrictEqual(new TypeError('null operation is forbidden'))
  })

  describe('terminal', () => {
    it('should not accept fork operation', async () => {
      function* test() {
        yield terminal(fork(dummy()))
      }

      await expect(cllr.call(test)).rejects.toStrictEqual(new TypeError('terminal forks are forbidden'))
    })

    it('should not accept recover operation', async () => {
      function* test() {
        yield terminal(recover())
      }

      await expect(cllr.call(test)).rejects.toStrictEqual(new TypeError('terminal recovers are forbidden'))
    })

    it('should not accept terminal operation', async () => {
      function* test() {
        yield terminal(terminal(dummy()))
      }

      await expect(cllr.call(test)).rejects.toStrictEqual(new TypeError('terminals cannot be nested'))
    })
  })

  it('should allow custom validators', async () => {
    let catched: any

    interface TestOperation extends OperationObject {
      answer: 42
    }

    const plugin: Plugin = {
      namespace: '@cuillere/test',
      handlers: {
        * test({ answer }: TestOperation) {
          return answer
        },
      },
      validators: {
        test({ answer }: TestOperation) {
          if (answer !== 42) throw TypeError('answer should be 42')
        },
      },
    }

    await cuillere(plugin).call(function* test() {
      yield { kind: '@cuillere/test/test', answer: 42 }
      try {
        yield { kind: '@cuillere/test/test', answer: 666 }
      } catch (e) {
        catched = e
      }
    })

    expect(catched).toStrictEqual(TypeError('answer should be 42'))
  })
})

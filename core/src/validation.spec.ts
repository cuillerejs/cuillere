import cuillere, { Cuillere, defer, fork, recover, terminal } from '.'

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

    await expect(cllr.call(test)).rejects.toStrictEqual('null operation is forbidden')
  })

  describe('terminal', () => {
    it('should not accept fork operation', async () => {
      function* test() {
        yield terminal(fork(dummy()))
      }

      await expect(cllr.call(test)).rejects.toStrictEqual(new TypeError('terminal forks are forbidden'))
    })

    it('should not accept defer operation', async () => {
      function* test() {
        yield terminal(defer(dummy()))
      }

      await expect(cllr.call(test)).rejects.toStrictEqual(new TypeError('terminal defers are forbidden'))
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
})

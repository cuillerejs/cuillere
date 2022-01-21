import { Cuillere, Operation, Plugin, call, callable, cuillere } from '..'

describe('callable', () => {
  interface TestOperation extends Operation {
    message: string
  }

  const test = callable((message: string): TestOperation => ({
    kind: '@cuillere/test/test',
    message,
  }))

  let cllr: Cuillere

  beforeEach(() => {
    const testPlugin: Plugin<{ test: TestOperation }> = {
      namespace: '@cuillere/test',
      handlers: {
        * test({ message }) {
          return `this is a test: "${message}"`
        },
      },
    }

    cllr = cuillere(testPlugin)
  })

  it('should be handled when yielded', async () => {
    function* testYielded() {
      return yield test('yielded')
    }

    await expect(cllr.call(testYielded)).resolves.toBe('this is a test: "yielded"')
  })

  it('should be handled when called', async () => {
    function* testCalled() {
      return yield call(test, 'called')
    }

    await expect(cllr.call(testCalled)).resolves.toBe('this is a test: "called"')
  })
})

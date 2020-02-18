/*eslint-en jest*/
import cuillere, { call, Cuillere } from '../src'
import { all , allSettled, chain, concurrentMiddleware } from '../src/middlewares/concurrent'

const delay = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

describe.only('concurrent', () => {
  let cllr: Cuillere, executionOrder: number[]
  async function* f1() {
    await delay(30)
    executionOrder.push(1)
    return 1
  }

  async function f2() {
    await delay(20)
    executionOrder.push(2)
    return 2
  }

  async function* f3() {
    await delay(10)
    executionOrder.push(3)
    return 3
  }

  beforeEach(() => {
    executionOrder = []
    cllr = cuillere(concurrentMiddleware())
  })

  it('should run all operations in parallele', async () => {
    const result = await cllr.call(function*() {
      return yield all([call(f1), call(f2), call(f3)])
    })

    expect(result).toEqual([1, 2, 3])
    expect(executionOrder).toEqual([3, 2, 1])
  })

  it('should run all operations in parallele and settle', async () => {
    const result = await cllr.call(function*() {
      return yield allSettled([call(f1), call(f2), call(f3)])
    })

    expect(result).toEqual([{status: 'fulfilled', value: 1}, {status: 'fulfilled', value: 2}, {status: 'fulfilled', value: 3}])
    expect(executionOrder).toEqual([3, 2, 1])
  })

  it('should run all operations one at a time', async () => {
    const result = await cllr.call(function*() {
      return yield chain([() => call(f1), () => call(f2), () => call(f3)])
    })

    expect(result).toEqual([1, 2, 3])
    expect(executionOrder).toEqual([1, 2, 3])
  })

})

import { Cuillere, Generator, all, allSettled, batched, call, cuillere, sleep, terminal } from '.'

describe('batch', () => {
  let cllr: Cuillere
  let batchedFn: (calls: [number][]) => Generator<any, number[]>
  let fn: (n: number) => Generator<any, number>

  function* delayedFn(n: number, delay: number) {
    yield sleep(delay)
    yield terminal(fn(n))
  }

  beforeEach(() => {
    cllr = cuillere()
    batchedFn = jest.fn(function* batchedFn(calls: [number][]) {
      return calls.flat()
    })

    fn = batched(batchedFn)
  })

  describe('without any options', () => {
    it('should group all concurrent calls in one batch', async () => {
      await expect(cllr.execute(all([
        fn(1),
        fn(2),
        fn(3),
      ]))).resolves.toEqual([1, 2, 3])
      expect(batchedFn).toHaveBeenCalledWith([[1], [2], [3]])
    })

    it('should execute delayed calls in a second batch', async () => {
      await expect(cllr.execute(all([
        fn(1),
        delayedFn(2, 10),
        fn(3),
        delayedFn(4, 10),
      ]))).resolves.toEqual([1, 2, 3, 4])
      expect(batchedFn).toHaveBeenNthCalledWith(1, [[1], [3]])
      expect(batchedFn).toHaveBeenNthCalledWith(2, [[2], [4]])
    })

    it('should be callable', async () => {
      function* callFn(n: number) {
        return yield call(fn, n)
      }

      await expect(cllr.execute(all([
        callFn(1),
        callFn(2),
        callFn(3),
      ]))).resolves.toEqual([1, 2, 3])
      expect(batchedFn).toHaveBeenCalledWith([[1], [2], [3]])
    })

    it('should keep function name', () => {
      expect(fn.name).toBe(batchedFn.name)
    })

    it('should propagate error to all calls of the batch', async () => {
      const error = new Error()
      fn = batched(function* batchedFn() {
        throw error
      })

      await expect(cllr.execute(allSettled([
        fn(1),
        fn(2),
        fn(3),
      ]))).resolves.toEqual([
        { status: 'rejected', reason: error },
        { status: 'rejected', reason: error },
        { status: 'rejected', reason: error },
      ])
    })
  })

  describe('when batch key is null or undefined', () => {
    beforeEach(() => {
      fn = batched(batchedFn, { getBatchKey: () => null })
    })

    it('should not group concurrent calls', async () => {
      await expect(cllr.execute(all([
        fn(1),
        fn(2),
        fn(3),
      ]))).resolves.toEqual([1, 2, 3])
      expect(batchedFn).toHaveBeenNthCalledWith(1, [[1]])
      expect(batchedFn).toHaveBeenNthCalledWith(2, [[2]])
      expect(batchedFn).toHaveBeenNthCalledWith(3, [[3]])
    })
  })

  describe('with a custom batch key', () => {
    beforeEach(() => {
      fn = batched(batchedFn, { getBatchKey: n => n % 2 })
    })

    it('should group concurrent calls with the same batch key', async () => {
      await expect(cllr.execute(all([
        fn(1),
        fn(2),
        fn(3),
        fn(4),
      ]))).resolves.toEqual([1, 2, 3, 4])
      expect(batchedFn).toHaveBeenNthCalledWith(1, [[1], [3]])
      expect(batchedFn).toHaveBeenNthCalledWith(2, [[2], [4]])
    })
  })

  describe('with a custom wait time', () => {
    beforeEach(() => {
      fn = batched(batchedFn, { wait: 30 })
    })

    it('should group all calls under wait time in one batch', async () => {
      await expect(cllr.execute(all([
        fn(1),
        delayedFn(2, 10),
        delayedFn(3, 20),
        delayedFn(4, 29),
      ]))).resolves.toEqual([1, 2, 3, 4])
      expect(batchedFn).toHaveBeenCalledWith([[1], [2], [3], [4]])
    })

    it('should execute calls after wait time in a second batch', async () => {
      await expect(cllr.execute(all([
        fn(1),
        delayedFn(2, 60),
        delayedFn(3, 29),
        delayedFn(4, 89),
      ]))).resolves.toEqual([1, 2, 3, 4])
      expect(batchedFn).toHaveBeenNthCalledWith(1, [[1], [3]])
      expect(batchedFn).toHaveBeenNthCalledWith(2, [[2], [4]])
    })
  })
})

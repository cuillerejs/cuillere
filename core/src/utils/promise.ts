/*
 * chain allows to apply a mapper function
 * and await the returned value for each items, one at a time.
 * @param array: an array like value (should have at leat reduce method)
 * @param mapper: a function taking an item
 * and returning a value to be awaited (a Promise in most cases)
 * @returns: A promise which resolves the array of results.
 * If an error occured, the chain is stopped
 * and the remaining items will not be passed throw the mapper function.
 */
export const chain = <T, R>(array: T[], mapper: (item: T, index: number) => Promise<R>) =>
  array.reduce(
    async (acc, item, index) => {
      await acc
      return mapper(item, index)
    },
    Promise.resolve<R>(undefined),
  )

export const allSettled = (promises: Promise<any>[]) => Promise.all(
  promises.map(async (p) => {
    try {
      return { status: 'fulfilled', value: await p }
    } catch (reason) {
      return { status: 'rejected', reason }
    }
  }),
)

export function executablePromise<T>(): [Promise<T>, (value?: T | PromiseLike<T>) => void, (err?: any) => void] {
  let resolve: (value?: T | PromiseLike<T>) => void
  let reject: (err?: any) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return [promise, resolve, reject]
}

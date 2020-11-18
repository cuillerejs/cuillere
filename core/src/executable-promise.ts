export function executablePromise<T>(): [Promise<T>, (value?: T | PromiseLike<T>) => void, (err?: any) => void] {
  let resolve: (value?: T | PromiseLike<T>) => void
  let reject: (err?: any) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return [promise, resolve, reject]
}

export const ApolloMiddlewarePlugin = (m1, m2) => ({
  requestDidStart: () => ({
    executionDidStart({ context }) {
      const executionPromise = resolvablePromise()

      // FIXME: make it work with a list of middleware
      m1(context, () => m2(context, () => executionPromise))

      return err => err ? executionPromise.reject(err) : executionPromise.resolve()
    }
  })
})

interface ResolvablePromise<T> extends Promise<T> {
  resolve(value?: T): void
  reject(err?: Error): void
}

const resolvablePromise = <T>(): ResolvablePromise<T> => {
  let resolveFn, rejectFn
  const promise: any = new Promise((resolve, reject) => {
    resolveFn = resolve
    rejectFn = reject
  })
  promise.resolve = resolveFn
  promise.reject = rejectFn
  return promise
}
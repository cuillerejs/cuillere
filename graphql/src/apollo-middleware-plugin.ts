export const ApolloMiddlewarePlugin = (...middlewares) => ({
  requestDidStart: () => ({
    executionDidStart({ context }) {
      // Creation of middleware list : [m1 : (cb) => Promise, m2: (cb) => Promise ...]
      const middlewaresWithCtx = middlewares.map((middleware, i) => cb =>  middleware(context, cb))

      const executionPromise = resolvablePromise()

      // Composition of middlewares : m1(() => m2(() => m3))
      const middlewareChain = middlewaresWithCtx.reduceRight(
        (prevFn, nextFn) => (...args) => nextFn(() => prevFn(...args)),
        _ => _
      )

      middlewareChain(() => executionPromise)

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
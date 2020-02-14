import { ApolloServerPlugin } from 'apollo-server-plugin-base'

export const ApolloMiddlewarePlugin = (m1: Middleware, m2: Middleware): ApolloServerPlugin => ({
  requestDidStart: () => ({
    executionDidStart({ context }) {
      const [executionPromise, resolve, reject] = resolvablePromise<void>()

      // FIXME: make it work with a list of middleware
      m1(context, () => m2(context, () => executionPromise))

      return err => err ? reject(err) : resolve()
    }
  })
})

export interface Middleware {
  <R>(ctx: Record<string, any>, cb: () => Promise<R>): Promise<R>
}

const resolvablePromise = <T>(): [Promise<T>, (value?: T | PromiseLike<T>) => void, (reason?: any) => void] => {
  let resolveFn: (value?: T | PromiseLike<T>) => void
  let rejectFn: (reason?: any) => void

  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve
    rejectFn = reject
  })

  return [promise, resolveFn, rejectFn]
}
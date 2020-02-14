import { ApolloServerPlugin } from 'apollo-server-plugin-base'

export const ApolloMiddlewarePlugin = (...middlewares: Middleware[]): ApolloServerPlugin => {
  const middlewareChain: Middleware = middlewares.reduceRight(
    (accF, m) => (ctx, f) => m(ctx, () => accF(ctx, f)),
  )

  return ({
    requestDidStart: () => ({
      executionDidStart({ context }) {
        const [executionPromise, resolve, reject] = resolvablePromise<void>()

        middlewareChain(context, () => executionPromise)
          // Catch promise to discard node's uncaught rejection warning
          // It can be discarded since this error is already handled by graphql
          .catch(() => { })

        return err => err ? reject(err) : resolve()
      }
    })
  })
}

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
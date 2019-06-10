/* eslint-disable no-await-in-loop */
import { isCall } from './operations'
import { compose } from './comose'

export interface Runner {
  (operation: any, ctx?: any, final?: boolean): Promise<any>
}

interface RunnerRef {
  run?: Runner
}

export interface Middleware {
  (next: Runner): Runner
}

function error(message: string, ...args): Error {
  return new Error(
    `[CUILLERE] Error : ${message} ${args.map(arg => JSON.stringify(arg, null, 2)).join(' ')}`,
  )
}

function checkMiddlewares(middlewares: Middleware[]) {
  const badMiddlewares = middlewares.map(middleware => typeof middleware !== 'function')
  if (badMiddlewares.some(isBad => isBad)) {
    const badMiddlwaresIndexes = badMiddlewares.filter(isBad => isBad).map((_, i) => i)
    throw error(`some given middlewares are not a function : ${badMiddlwaresIndexes.join(', ')}`)
  }
}

function callMiddleware(runnerRef: RunnerRef): Runner {
  return async function(operation, ctx, final) {
    const { run } = runnerRef
    // final means we are trying to handle an operation returned by a generator function
    // In this case, we should simply return the operation if it wasn't handled by a middleware and it's not a call
    if (!isCall(operation)) {
      if (final) return operation
      throw error(
        'the operation had not been handle by any middleware. You probably used a missformed operation or forgotten to add a middleware :',
        operation,
      )
    }

    if (!operation.func) {
      throw error(`the call operation should have a function 'func'`)
    }

    const runningCall = operation.func(...operation.args)

    if (!runningCall.next) {
      throw error(
        `the call operation function should return an Iterable. You probably used 'function' instead of 'function*'`,
      )
    }

    let current = runningCall.next()
    while (!current.done) {
      current = runningCall.next(await run(current.value, ctx, false))
    }

    return run(current.value, ctx, true)
  }
}

export function makeRunner(...middlewares: Middleware[]): Runner {
  checkMiddlewares(middlewares)
  const runnerReference: RunnerRef = {}
  runnerReference.run = compose(...middlewares)(callMiddleware(runnerReference))

  return runnerReference.run
}

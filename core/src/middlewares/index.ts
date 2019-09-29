import { error } from '../errors'
import { OperationHandler } from '..'
import { Cuillere } from '../run';

export * from './call'
export * from './context'
export * from './concurrent'

export interface Middleware {
  (next: OperationHandler): (operation: any, ctx: any, run: OperationHandler) => Promise<any>
}

export interface Middleware2 {
  (next: OperationHandler, ctx: any, cllr: Cuillere): OperationHandler
}

export function checkMiddlewares(middlewares: Middleware[]) {
  const badMiddlewares = middlewares.map(middleware => typeof middleware !== 'function')
  if (badMiddlewares.some(isBad => isBad)) {
    const badMiddlewaresIndexes = badMiddlewares.filter(isBad => isBad).map((_, i) => i)
    throw error(`some given middlewares are not a function : ${badMiddlewaresIndexes.join(', ')}`)
  }
}

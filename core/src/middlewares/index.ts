import { error } from '../errors'
import { Run } from '..'

export * from './call'
export * from './context'
export * from './concurrent'

export interface Middleware {
  (next: Run): (operation: any, ctx: any, run: Run) => Promise<any>
}

export function checkMiddlewares(middlewares: Middleware[]) {
  const badMiddlewares = middlewares.map(middleware => typeof middleware !== 'function')
  if (badMiddlewares.some(isBad => isBad)) {
    const badMiddlwaresIndexes = badMiddlewares.filter(isBad => isBad).map((_, i) => i)
    throw error(`some given middlewares are not a function : ${badMiddlwaresIndexes.join(', ')}`)
  }
}

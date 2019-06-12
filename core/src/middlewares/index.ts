import { error } from '../errors'

export * from './call'
export * from './context'

export interface Next {
  (operation: any): Promise<any>
}

export interface Middleware {
  (next: Next): (operation: any, ctx: any) => Promise<any>
}

export function checkMiddlewares(middlewares: Middleware[]) {
  const badMiddlewares = middlewares.map(middleware => typeof middleware !== 'function')
  if (badMiddlewares.some(isBad => isBad)) {
    const badMiddlwaresIndexes = badMiddlewares.filter(isBad => isBad).map((_, i) => i)
    throw error(`some given middlewares are not a function : ${badMiddlwaresIndexes.join(', ')}`)
  }
}

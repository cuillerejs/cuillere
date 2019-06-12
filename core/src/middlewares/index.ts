import { error } from '../errors'

export interface Runner {
  (operation: any, ctx: Record<string, any>): Promise<any>
}

export interface Middleware {
  (next: Runner): Runner
}

export function checkMiddlewares(middlewares: Middleware[]) {
  const badMiddlewares = middlewares.map(middleware => typeof middleware !== 'function')
  if (badMiddlewares.some(isBad => isBad)) {
    const badMiddlwaresIndexes = badMiddlewares.filter(isBad => isBad).map((_, i) => i)
    throw error(`some given middlewares are not a function : ${badMiddlwaresIndexes.join(', ')}`)
  }
}

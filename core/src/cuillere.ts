import { Middleware, concurrentMiddleware, contextMiddleware } from './middlewares'
import { Generator } from './generator'
import { call, execute, start, CallFunction } from './operations'
import { Task } from './task'

export interface Cuillere {
  ctx: (ctx: any) => Cuillere
  start: (operation: any) => Promise<any>
  call: <Args extends any[], R>(func: CallFunction<Args, R>, ...args: Args) => Promise<R>
  execute: <R>(gen: Generator<R>) => Promise<R>
}

export default function cuillere(...pMws: Middleware[]): Cuillere {
  pMws.forEach((mw, index) => {
    if (typeof mw !== 'function') {
      throw TypeError(`middlewares[${index}] should be a function*: ${mw}`)
    }
  })

  const mws = pMws.concat([
    concurrentMiddleware(),
    contextMiddleware(),
  ])

  const make = (pCtx?: any) => {
    const ctx = pCtx || {}

    const cllr: Cuillere = {
      ctx: make,
      start: operation => new Task(mws, ctx, start(operation)).result,
      call: (func, ...args) => cllr.start(call(func, ...args)),
      execute: gen => cllr.start(execute(gen)),
    }

    return cllr
  }

  return make()
}

/* eslint-disable no-param-reassign */
import { Middleware, concurrentMiddleware, contextMiddleware, FilteredHandler, Handler } from './middlewares'
import { Generator } from './generator'
import { call, execute, start, CallFunction, Operation } from './operations'
import { Task } from './task'

export interface Cuillere {
  ctx: (ctx: any) => Cuillere
  start: (operation: Operation) => Promise<any>
  call: <Args extends any[], R>(func: CallFunction<Args, R>, ...args: Args) => Promise<R>
  execute: <R>(gen: Generator<R, Operation>) => Promise<R>
}

export default function cuillere(...pMws: Middleware[]): Cuillere {
  const instances = new WeakMap<any, Cuillere>()

  const mws = pMws.concat([
    concurrentMiddleware(),
    contextMiddleware(),
  ])

  const handlers: Record<string, FilteredHandler[]> = {}

  const pushHandler = (kind: string) => (handler: Handler) => {
    if (!handlers[kind]) handlers[kind] = []
    handlers[kind].push(typeof handler === 'function' ? { handle: handler, filter: () => true } : handler)
  }

  for (const mw of mws) {
    Object.entries(mw).forEach(([kind, handler]) => {
      if (Array.isArray(handler)) handler.forEach(pushHandler(kind))
      else pushHandler(kind)(handler)
    })
  }

  const make = (pCtx?: any) => {
    const ctx = pCtx || {}

    if (instances.has(ctx)) return instances.get(ctx)

    const cllr: Cuillere = {
      ctx: make,
      start: handlers.start
        ? operation => new Task(handlers, ctx, start(operation)).result
        : operation => new Task(handlers, ctx, operation).result,
      call: (func, ...args) => cllr.start(call(func, ...args)),
      execute: gen => cllr.start(execute(gen)),
    }

    instances.set(ctx, cllr)

    return cllr
  }

  return make()
}

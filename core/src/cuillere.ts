/* eslint-disable no-param-reassign */
import { Plugin, concurrentPlugin, contextPlugin, HandlerDescriptor } from './plugins'
import { Generator, GeneratorFunction } from './generator'
import { call, start, Operation } from './operations'
import { Stack } from './stack'

export interface Cuillere {
  ctx: (ctx: any) => Cuillere
  start: (operation: Operation) => Promise<any>
  call: <Args extends any[], R>(func: GeneratorFunction<Args, R>, ...args: Args) => Promise<R>
  execute: <R>(gen: Generator<R, Operation>) => Promise<R>
}

export default function cuillere(...pPlugins: Plugin[]): Cuillere {
  const instances = new WeakMap<any, Cuillere>()

  const plugins = pPlugins.concat([
    concurrentPlugin(),
    contextPlugin(),
  ])

  const handlers: Record<string, HandlerDescriptor[]> = {}

  for (const plugin of plugins) {
    Object.entries(plugin.handlers).forEach(([kind, handler]) => {
      const namespace = typeof handler === 'function' ? plugin.namespace : (handler.namespace ?? plugin.namespace)
      const nsKind = `${namespace}/${kind}`

      if (!handlers[nsKind]) handlers[nsKind] = []

      handlers[nsKind].push(typeof handler === 'function' ? { handle: handler } : handler)
    })
  }

  const make = (pCtx?: any) => {
    const ctx = pCtx || {}

    if (instances.has(ctx)) return instances.get(ctx)

    const cllr: Cuillere = {
      ctx: make,
      start: handlers.start
        ? operation => new Stack(handlers, ctx).start(start(operation)).result
        : operation => new Stack(handlers, ctx).start(operation).result,
      call: (func, ...args) => cllr.start(call(func, ...args)),
      execute: gen => cllr.start(gen),
    }

    instances.set(ctx, cllr)

    return cllr
  }

  return make()
}

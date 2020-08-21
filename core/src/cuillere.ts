import { HandlerDescriptor, Plugin, batchPlugin, concurrentPlugin, contextPlugin } from './plugins'
import { Generator, GeneratorFunction } from './generator'
import { Operation, call, start } from './operations'
import { Stack } from './stack'

export interface Cuillere {
  ctx: (ctx: any) => Cuillere
  start: (operation: Operation) => Promise<any>
  call: <Args extends any[], R>(func: GeneratorFunction<Args, R>, ...args: Args) => Promise<R>
  execute: <R>(gen: Generator<R, Operation>) => Promise<R>
}

const namespacePrefix = '@'

export default function cuillere(...pPlugins: Plugin[]): Cuillere {
  const instances = new WeakMap<any, Cuillere>()

  const plugins = pPlugins.concat([
    batchPlugin(),
    concurrentPlugin(),
    contextPlugin(),
  ])

  const handlers: Record<string, HandlerDescriptor[]> = {}

  for (const plugin of plugins) {
    const pluginHasNamespace = 'namespace' in plugin

    if (pluginHasNamespace && !plugin.namespace.startsWith(namespacePrefix)) {
      throw TypeError(`Plugin namespace should start with ${namespacePrefix}, found ${plugin.namespace}`)
    }

    Object.entries(plugin.handlers).forEach(([kind, handler]) => {
      let nsKind: string
      if (pluginHasNamespace) nsKind = kind.startsWith(namespacePrefix) ? kind : `${plugin.namespace}/${kind}`
      else {
        if (!kind.startsWith(namespacePrefix)) throw TypeError(`Plugin without namespace must have only qualified handlers, found "${kind}"`)
        nsKind = kind
      }

      if (!handlers[nsKind]) handlers[nsKind] = []

      if (Array.isArray(handler)) handlers[nsKind].push(...handler)
      else handlers[nsKind].push(typeof handler === 'function' ? { handle: handler } : handler)
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

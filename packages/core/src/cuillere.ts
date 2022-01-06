import { batchPlugin } from './batch'
import { concurrentPlugin } from './concurrent'
import { CORE_NAMESPACE } from './core-namespace'
import type { Effect } from './effect'
import type { GeneratorFunction } from './generator'
import { call, start } from './operation'
import type { HandleFunction, Plugin, ValidatorFunction } from './plugin'
import { Stack } from './stack'

/**
 * A configured Cuillere instance.
 *
 * Uses the list of plugins given to [[cuillere]] and the context given to [[Cuillere.ctx]] or an empty context by default.
 */
export interface Cuillere {

  /**
   * Replaces the context object used by this {@link Cuillere} instance.
   *
   * @param ctx The new context object to be used
   * @returns A new {@link Cuillere} instance.
   */
  ctx: (ctx: any) => Cuillere

  /**
   * Executes the given {@link Effect}.
   *
   * @param effect The effected to be executed
   * @typeParam R Return type of the effect
   * @returns Promise to be resolved with the result of the effect
   */
  execute: <R>(effect: Effect<R>) => Promise<Awaited<R>>

  /**
   * Calls the given generator function with the given arguments.
   *
   * Shorthand for:
   * ```typescript
   * cllr.execute(call(func, ...args))
   * ```
   *
   * @param func Generator function to be called
   * @param args Arguments for the generator function
   * @typeParam Args Generator function's arguments type
   * @typeParam R Generator function's return type
   * @returns Promise to be resolved with the result of the value returned by the generator function
   */
  call: <Args extends any[], R>(func: GeneratorFunction<Args, R, Effect>, ...args: Args) => Promise<Awaited<R>>
}

const namespacePrefix = '@'

/**
 * Creates a new {@link Cuillere} instance with the given plugins.
 *
 * @param plugins Plugins to be used by the new {@link Cuillere} instance
 * @returns A new {@link Cuillere} instance with an empty context
 */
export function cuillere(...plugins: Plugin[]): Cuillere {
  const allPlugins = plugins.concat([
    batchPlugin(),
    concurrentPlugin(),
  ])

  const handlers: Record<string, HandleFunction[]> = {}
  const validators: Record<string, ValidatorFunction> = {}

  for (const plugin of allPlugins) {
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

      handlers[nsKind].push(handler)
    })

    if ('validators' in plugin) {
      const pluginValidators = Object.entries(plugin.validators)

      if (!pluginHasNamespace && pluginValidators.length > 0) throw TypeError('Plugin without namespace must not have validators')

      pluginValidators.forEach(([kind, validator]) => {
        if (kind.startsWith(namespacePrefix)) throw TypeError(`Qualified validators are forbidden, found "${kind}"`)

        validators[`${plugin.namespace}/${kind}`] = validator
      })
    }
  }

  const instances = new WeakMap<any, Cuillere>()

  const make = (pCtx?: any) => {
    const ctx = pCtx || {}

    if (instances.has(ctx)) return instances.get(ctx)

    const cllr: Cuillere = {
      ctx: make,
      execute: `${CORE_NAMESPACE}/start` in handlers
        ? effect => new Stack(handlers, ctx, validators).start(start(effect)).result
        : effect => new Stack(handlers, ctx, validators).start(effect).result,
      call: (func, ...args) => cllr.execute(call(func, ...args)),
    }

    instances.set(ctx, cllr)

    return cllr
  }

  return make()
}

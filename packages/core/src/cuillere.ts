import { batchPlugin } from './batch'
import { concurrentPlugin } from './concurrent'
import { timePlugin } from './time'
import type { Generator } from './generator'
import type { Operation } from './operation'
import type { Plugin } from './plugin'
import { Runner } from './runner'

/**
 * A configured Cuillere instance.
 *
 * Uses the list of plugins given to [[cuillere]] and the context given to [[Cuillere.ctx]] or an empty context by default.
 */
export interface Cuillere {

  /**
   * Creates a new {@link Cuillere} instance using the given context.
   *
   * @param context The new context object to be used.
   * @returns A new {@link Cuillere} instance.
   */
  context: (context: any) => Cuillere

  /**
   * Runs the given Generator.
   *
   * @param generator The generator to be run.
   * @typeParam R Return type of the generator.
   * @returns Promise to be resolved with the result of the generator.
   */
  run: <R>(generator: Generator<R, Operation>) => Promise<R>
}

/**
 * Creates a new {@link Cuillere} instance with the given plugins.
 *
 * @param plugins Plugins to be used by the new {@link Cuillere} instance.
 * @returns A new {@link Cuillere} instance with an empty context.
 */
export function cuillere(...plugins: Plugin[]): Cuillere {
  const allPlugins = plugins.concat([
    batchPlugin(),
    concurrentPlugin(),
    timePlugin(),
  ])

  const handlers: Record<string, ((operation: Operation, context: any) => unknown)> = {}
  const onStarts: Plugin['onStart'][] = []

  // FIXME check plugins have a defined and unique namespace

  for (const plugin of allPlugins) {
    for (const [kind, handler] of Object.entries(plugin.handlers)) {
      const nsKind = `${plugin.namespace}/${kind}`

      handlers[nsKind] = handler
    }

    if (plugin.onStart) {
      onStarts.push(plugin.onStart)
    }
  }

  const instances = new WeakMap<any, Cuillere>()

  const make = (pCtx?: any) => {
    const ctx = pCtx || {}

    if (instances.has(ctx)) return instances.get(ctx)

    const cllr: Cuillere = {
      context: make,
      async run(generator) {
        if (onStarts.length) {
          await Promise.all(onStarts.map(onStart => onStart(ctx, cllr)))
        }
        return new Runner(handlers, ctx, generator).run()
      },
    }

    instances.set(ctx, cllr)

    return cllr
  }

  return make()
}

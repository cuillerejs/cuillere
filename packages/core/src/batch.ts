import type { Cuillere } from './cuillere'
import { type GeneratorFunction } from './generator'
import { type Operation } from './operation'
import { type Plugin } from './plugin'

/**
 * Creates a batched generator function.
 *
 * @param func Generator function responsible for handling a batch of calls.
 *             Receives an array of arguments arrays.
 *             Must return an array of return values corresponsing to the array of calls received.
 * @param options Batching options.
 * @typeParam Args Batched generator function's arguments type.
 * @typeParam R Batched generator function's return type.
 * @returns A new batched generator function.
 */
export function batched<Args extends any[] = any[], R = any>(
  func: GeneratorFunction<[Args[]], R[]>,
  options: {
    /**
     * Function responsible for computing the batch key for one call.
     * @param args Arguments of one call.
     * @returns Batch key for the call, `null` or `undefined` if the call should not be batched.
     */
    getBatchKey?: (...args: Args) => any

    /**
     * Wait time in milliseconds before first call and batch execution.
     */
    wait?: number
  } = {},
): GeneratorFunction<Args, R> {
  const { getBatchKey = () => func, wait } = options
  return {
    async*[func.name](...args: Args) {
      const key = getBatchKey(...args)
      if (key == null) {
        return (yield* func([args]))[0]
      }

      return yield* batch(func, args, key, wait)
    },
  }[func.name]
}

const NAMESPACE = '@cuillere/batch'

/**
 * @hidden
 */
export type BatchOperations = {
  batch: Batch
}

/**
 * @hidden
 */
export type BatchContext = {
  [BATCH_CTX]?: Map<any, BatchEntry>
}

/**
 * Creates a new batch plugin instance.
 *
 * This is an internal plugin which is automatically added to cuillere.
 *
 * @param options Batch plugin options.
 * @returns A new Batch plugin instance.
 * @hidden
 */
export const batchPlugin = ({ wait: defaultWait }: BatchOptions = {}): Plugin<BatchOperations, BatchContext> => ({
  namespace: NAMESPACE,

  handlers: {
    async batch({ func, args, key, wait }, ctx, cllr) {
      if (!ctx[BATCH_CTX]) ctx[BATCH_CTX] = new Map()

      let entry: BatchEntry
      if (ctx[BATCH_CTX].has(key)) {
        entry = ctx[BATCH_CTX].get(key)
      } else {
        entry = {
          args: [],
          func,
          result: new Promise<any[]>((resolve, reject) => {
            setTimeout(() => executeBatch(cllr, ctx, key, resolve, reject), wait ?? defaultWait)
          }),
        }
        ctx[BATCH_CTX].set(key, entry)
      }

      const index = entry.args.push(args) - 1
      return (await entry.result)[index]
    },
  },
})

function executeBatch(cllr: Cuillere, ctx: BatchContext, key: any, resolve, reject) {
  const entry = ctx[BATCH_CTX].get(key)
  ctx[BATCH_CTX].delete(key)
  cllr.run(entry.func(entry.args)).then(resolve, reject)
}

/**
 * Batch plugin options.
 *
 * @hidden
 */
export interface BatchOptions {

  /**
   * Wait time in milliseconds before batched function calls are executed.
   *
   * If empty or `0`, [`setImmediate()`](https://mdn.io/setImmediate) is used.
   */
  wait?: number
}

const BATCH_CTX = Symbol('BATCH_CTX')

interface BatchEntry {
  result: Promise<any[]>
  func: GeneratorFunction
  args: any[][]
}

interface Batch<Args extends any[] = any[], R = any> extends Operation {
  func: GeneratorFunction<[Args[]], R[]>
  args: Args
  key: any
  wait?: number
}

function* batch<Args extends any[] = any[], R = any>(func: GeneratorFunction<[Args[]], R[]>, args: Args, key: any, wait?: number) {
  return yield { kind: `${NAMESPACE}/batch`, func, args, key, wait } as R // LOL
}

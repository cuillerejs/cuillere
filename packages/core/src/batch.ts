import { type GeneratorFunction } from './generator'
import { type Operation } from './operation'
import { type Plugin } from './plugin'
import { type Task } from './task'
import { after } from './time'

export function batched<Args extends any[] = any[], R = any>(
  func: GeneratorFunction<Args[], R[]>,
  getBatchKey: (...args: Args) => any = () => func,
): (...args: Args) => Operation {
  return (...args) => {
    const batchKey = getBatchKey(...args)
    if (!batchKey) return { kind: `${NAMESPACE}/execute`, func, args }
    return { kind: `${NAMESPACE}/batch`, func, args, key: batchKey }
  }
}

const NAMESPACE = '@cuillere/batch'

/**
 * Creates a new batch plugin instance.
 *
 * This is an internal plugin which is automatically added to cuillere.
 *
 * @param options Batch plugin options.
 * @returns A new Batch plugin instance.
 * @hidden
 */
export const batchPlugin = ({ timeout }: BatchOptions = {}): Plugin<{ [BATCH_CTX]?: Map<any, BatchEntry> }> => ({
  namespace: NAMESPACE,

  handlers: {
    async* batch({ key, func, args }: Batch, ctx) {
      if (!ctx[BATCH_CTX]) ctx[BATCH_CTX] = new Map()

      let entry: BatchEntry
      if (ctx[BATCH_CTX].has(key)) {
        entry = ctx[BATCH_CTX].get(key)
      } else {
        let resolveResult: (value?: any[] | PromiseLike<any[]>) => void
        const result = new Promise<any[]>((resolve) => { resolveResult = resolve })

        entry = { resolves: [], rejects: [], args: [], func, result }
        ctx[BATCH_CTX].set(key, entry)

        const task: Task = yield after(executeBatch(key), timeout)
        resolveResult(task.result)
      }

      const index = entry.args.push(args) - 1
      return (await entry.result)[index]
    },

    async* execute({ func, args }: Execute) {
      const res = yield func(args)
      return res[0]
    },

    async* executeBatch({ key }: ExecuteBatch, ctx) {
      const entry = ctx[BATCH_CTX].get(key)
      ctx[BATCH_CTX].delete(key)
      return yield entry.func(...entry.args)
    },
  },
})

/**
 * Batch plugin options.
 *
 * @hidden
 */
export interface BatchOptions {

  /**
   * Timeout in milliseconds before batched effects are executed.
   *
   * If empty or `0`, [`setImmediate()`](https://mdn.io/setImmediate) is used.
   */
  timeout?: number
}

const BATCH_CTX = Symbol('BATCH_CTX')

interface BatchEntry {
  result: Promise<any[]>
  resolves: ((res: any) => void)[]
  rejects: ((err: any) => void)[]
  func: GeneratorFunction
  args: any[][]
}

interface Batch<Args extends any[] = any[], R = any> extends Operation {
  func: GeneratorFunction<Args[], R[]>
  args: Args
  key: any
}

interface Execute<Args extends any[] = any[], R = any> extends Operation {
  func: GeneratorFunction<Args[], R[]>
  args: Args
}

interface ExecuteBatch extends Operation {
  key: any
}

function executeBatch(key: any): ExecuteBatch {
  return { kind: `${NAMESPACE}/executeBatch`, key }
}

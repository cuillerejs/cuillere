import { type GeneratorFunction } from './generator'
import { type Operation, call, terminal } from './operation'
import { type Plugin } from './plugin'
import { type Task } from './task'
import { after } from './time'

/**
 * Creates a batched generator function.
 *
 * @param func Generator function responsible for handling a batch of calls.
 *             Receives an array of arguments arrays.
 *             Must return an array of return values corresponsing to the array of calls received.
 * @param getBatchKey Function responsible for computing the batch key for one call.
 *                    Receives the arguments of one call.
 * @typeParam Args Batched generator function's arguments type.
 * @typeParam R Batched generator function's return type.
 * @returns A new batched generator function.
 */
export function batched<Args extends any[] = any[], R = any>(
  func: GeneratorFunction<[Args[]], R[]>,
  getBatchKey: (...args: Args) => any = () => func,
): GeneratorFunction<Args, R> {
  return {
    * [func.name](...args: Args) {
      const key = getBatchKey(...args)
      yield terminal(key == null ? execute(func, args) : batch(func, args, key))
      return null as R // never actually reached, only for typing
    },
  }[func.name]
}

const NAMESPACE = '@cuillere/batch'

/**
 * @hidden
 */
export type BatchOperations = {
  batch: Batch
  execute: Execute
  executeBatch: ExecuteBatch
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
export const batchPlugin = ({ timeout }: BatchOptions = {}): Plugin<BatchOperations, BatchContext> => ({
  namespace: NAMESPACE,

  handlers: {
    async* batch({ key, func, args }, ctx) {
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

    async* execute({ func, args }) {
      return (yield call(func, [args]))[0]
    },

    async* executeBatch({ key }, ctx) {
      const entry = ctx[BATCH_CTX].get(key)
      ctx[BATCH_CTX].delete(key)
      yield terminal(call(entry.func, entry.args))
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
  func: GeneratorFunction<[Args[]], R[]>
  args: Args
  key: any
}

function batch<Args extends any[] = any[], R = any>(func: GeneratorFunction<[Args[]], R[]>, args: Args, key: any): Batch<Args, R> {
  return { kind: `${NAMESPACE}/batch`, func, args, key }
}

interface Execute<Args extends any[] = any[], R = any> extends Operation {
  func: GeneratorFunction<[Args[]], R[]>
  args: Args
}

function execute<Args extends any[] = any[], R = any>(func: GeneratorFunction<[Args[]], R[]>, args: Args): Execute<Args, R> {
  return { kind: `${NAMESPACE}/execute`, func, args }
}

interface ExecuteBatch extends Operation {
  key: any
}

function executeBatch(key: any): ExecuteBatch {
  return { kind: `${NAMESPACE}/executeBatch`, key }
}

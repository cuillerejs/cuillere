import { Middleware } from './middleware'
import { GeneratorFunction } from '../generator'
import { execute, fork, isCall, delegate, Call } from '../operations'
import { Task } from '../task'

interface BatchOptions {
  timeout?: number
}

export function batched<Args extends any[], R>(
  func: GeneratorFunction<Args[], R>,
  batchKey: (...args: Args) => any = () => func,
): BatchedGeneratorFunction<Args, R> {
  func[BATCHED] = true
  func[BATCH_KEY] = batchKey
  return func as BatchedGeneratorFunction<Args, R>
}

export const batchMiddelware = ({ timeout }: BatchOptions = {}): Middleware =>
  function* batchMiddelware(operation, ctx: Context) {
    if (!ctx[BATCH_CTX]) ctx[BATCH_CTX] = new Map<any, BatchEntry>()

    if (isBatchedCall(operation)) {
      const batchKey = operation.func[BATCH_KEY](...operation.args)

      if (!batchKey) return yield delegate(execute(operation.func(operation.args)))

      let entry: any
      if (ctx[BATCH_CTX].has(batchKey)) {
        entry = ctx[BATCH_CTX].get(batchKey)
      } else {
        entry = { resolves: [], args: [], func: operation.func }
        ctx[BATCH_CTX].set(batchKey, entry)
        entry.fork = yield fork(delayBatchExecution, batchKey, timeout)
      }

      entry.args.push(operation.args)
      return new Promise(resolve => entry.resolves.push(resolve))
    }

    if (isExecuteBatch(operation)) {
      const entry = ctx[BATCH_CTX].get(operation.batchKey)
      ctx[BATCH_CTX].delete(operation.batchKey)
      const result = yield execute(entry.func(...entry.args))
      entry.resolves.forEach((resolve, i) => resolve(result[i]))
      return
    }

    return yield delegate(operation)
  }

const BATCHED = Symbol('BATCHED')
const BATCH_CTX = Symbol('BATCH_CTX')
const BATCH_KEY = Symbol('BATCH_KEY')
const EXECUTE_BATCH = Symbol('EXECUTE_BATCH')

export interface BatchedGeneratorFunction<Args extends any[] = any[], R = any>
  extends GeneratorFunction<Args[], R[]> {
  [BATCHED]: true
  [BATCH_KEY]: (...args: Args) => any
}

interface BatchEntry {
  fork: Task
  resolves: ((res: any) => void)[]
  func: GeneratorFunction
  args: any[][]
}

interface Context {
  [BATCH_CTX]?: Map<any, BatchEntry>
}

const isBatchedCall = (operation: any): operation is Call =>
  isCall(operation) && operation.func[BATCHED]

interface ExecuteBatch {
  [EXECUTE_BATCH]: true
  batchKey: any
}

const isExecuteBatch = (operation: any): operation is ExecuteBatch => operation?.[EXECUTE_BATCH]

const executeBatch = (fn: GeneratorFunction): ExecuteBatch => ({
  [EXECUTE_BATCH]: true,
  batchKey: fn,
})

async function* delayBatchExecution(batchKey: any, delay?: number) {
  await new Promise(resolve => (delay ? setTimeout(resolve, delay) : setImmediate(resolve)))
  yield executeBatch(batchKey)
}

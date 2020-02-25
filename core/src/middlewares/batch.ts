import { Middleware } from './middleware'
import { GeneratorFunction } from '../generator'
import { execute, fork, isCall, Task, delegate, Call } from '../cuillere'

interface BatchOptions {
  timeout?: number
}

export function batched<T extends GeneratorFunction>(
  func: T,
  batchKey: (...args: any[]) => any = () => func,
): T {
  func[IS_BATCHED] = true // eslint-disable-line no-param-reassign
  func[BATCH_KEY] = batchKey
  return func
}

export const batchMiddelware = ({ timeout }: BatchOptions = {}): Middleware =>
  function* batchMiddelware(operation, ctx: Context) {
    if (!ctx[BATCH_CTX]) ctx[BATCH_CTX] = new Map<any, BatchEntry>()

    if (isBatchedCall(operation)) {
      const batchKey = operation.func[BATCH_KEY](...operation.args)

      if (!batchKey) return yield delegate(operation)

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

const IS_BATCHED = Symbol('IS_BATCHED')
const BATCH_CTX = Symbol('BATCH_CTX')
const BATCH_KEY = Symbol('BATCH_KEY')
const EXECUTE_BATCH = Symbol('EXECUTE_BATCH')

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
  isCall(operation) && operation.func[IS_BATCHED]

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

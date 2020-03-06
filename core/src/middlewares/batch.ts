import { Middleware } from './middleware'
import { GeneratorFunction } from '../generator'
import { execute, fork, Call, Operation } from '../operations'
import { Task } from '../task'

interface BatchOptions {
  timeout?: number
}

export function batched<Args extends any[] = any[], R = any>(
  func: GeneratorFunction<Args[], R>,
  batchKey: (...args: Args) => any = () => func,
): BatchedGeneratorFunction<Args, R> {
  func[BATCHED] = true
  func[BATCH_KEY] = batchKey
  return func as BatchedGeneratorFunction<Args, R>
}

export const batchMiddelware = ({ timeout }: BatchOptions = {}): Middleware => ({
  call: {
    filter: isBatchedCall,
    async* handle(operation: any, ctx: Context) {
      const batchKey = operation.func[BATCH_KEY](...operation.args)

      if (!batchKey) {
        const [result] = (yield execute(operation.func(operation.args))) as any[]
        return result
      }

      let entry: any
      if (ctx[BATCH_CTX].has(batchKey)) {
        entry = ctx[BATCH_CTX].get(batchKey)
      } else {
        entry = { resolves: [], rejects: [], args: [], func: operation.func }
        ctx[BATCH_CTX].set(batchKey, entry)
        entry.fork = yield fork(delayBatchExecution, batchKey, timeout)
      }

      entry.args.push(operation.args)
      return new Promise((resolve, reject) => {
        entry.resolves.push(resolve)
        entry.rejects.push(reject)
      })
    },
  },

  async* executeBatch(operation: any, ctx: Context) {
    const entry = ctx[BATCH_CTX].get(operation.batchKey)
    ctx[BATCH_CTX].delete(operation.batchKey)
    try {
      const result = yield execute(entry.func(...entry.args))
      entry.resolves.forEach((resolve, i) => resolve(result[i]))
    } catch (err) {
      entry.rejects.forEach((reject => reject(err)))
    }
  },
})

const BATCHED = Symbol('BATCHED')
const BATCH_CTX = Symbol('BATCH_CTX')
const BATCH_KEY = Symbol('BATCH_KEY')

export interface BatchedGeneratorFunction<Args extends any[] = any[], R = any>
  extends GeneratorFunction<Args[], R[]> {
  [BATCHED]: true
  [BATCH_KEY]: (...args: Args) => any
}

interface BatchEntry {
  fork: Task
  resolves: ((res: any) => void)[]
  rejects: ((err: any) => void)[]
  func: GeneratorFunction
  args: any[][]
}

interface Context {
  [BATCH_CTX]?: Map<any, BatchEntry>
}

const isBatchedCall = (operation: any): operation is Call =>
  operation.type === 'call' && operation.func[BATCHED]

interface ExecuteBatch extends Operation {
  batchKey: any
}

function executeBatch(fn: GeneratorFunction): ExecuteBatch {
  return {
    kind: 'executeBatch',
    batchKey: fn,
  }
}

async function* delayBatchExecution(batchKey: any, delay?: number) {
  await new Promise(resolve => (delay ? setTimeout(resolve, delay) : setImmediate(resolve)))
  yield executeBatch(batchKey)
}

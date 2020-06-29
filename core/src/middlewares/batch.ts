import { Middleware } from './middleware'
import { GeneratorFunction } from '../generator'
import { execute, fork, CallOperation, Operation, OperationObject } from '../operations'
import { executablePromise } from '../utils/promise'
import { delayOperation } from '../utils/delay'
import { Stack } from '../stack'

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
    async* handle(operation: CallOperation, ctx: Context) {
      const batchKey = operation.func[BATCH_KEY](...operation.args)

      if (!batchKey) {
        const [result] = (yield execute(operation.func(operation.args))) as any[]
        return result
      }

      if (!ctx[BATCH_CTX]) ctx[BATCH_CTX] = new Map()

      let entry: BatchEntry
      if (ctx[BATCH_CTX].has(batchKey)) {
        entry = ctx[BATCH_CTX].get(batchKey)
      } else {
        const [result, resolve] = executablePromise<any[]>()
        entry = { resolves: [], rejects: [], args: [], func: operation.func, result }
        ctx[BATCH_CTX].set(batchKey, entry)

        const stack: Stack = yield fork(delayOperation, executeBatch(batchKey), timeout)
        resolve(stack.result)
      }

      const index = entry.args.push(operation.args) - 1
      return (await entry.result)[index]
    },
  },

  async* executeBatch(operation: any, ctx: Context) {
    const entry = ctx[BATCH_CTX].get(operation.batchKey)
    ctx[BATCH_CTX].delete(operation.batchKey)
    return yield execute(entry.func(...entry.args))
  },
})

const BATCHED = Symbol('BATCHED')
const BATCH_CTX = Symbol('BATCH_CTX')
const BATCH_KEY = Symbol('BATCH_KEY')

export interface BatchedGeneratorFunction<Args extends any[] = any[], R = any> extends GeneratorFunction<Args[], R[], Operation> {
  [BATCHED]: true
  [BATCH_KEY]: (...args: Args) => any
}

interface BatchEntry {
  result: Promise<any[]>
  resolves: ((res: any) => void)[]
  rejects: ((err: any) => void)[]
  func: GeneratorFunction
  args: any[][]
}

interface Context {
  [BATCH_CTX]?: Map<any, BatchEntry>
}

const isBatchedCall = (operation: any): operation is CallOperation => operation.func[BATCHED]

interface ExecuteBatch extends OperationObject {
  batchKey: any
}

function executeBatch(batchKey: any): ExecuteBatch {
  return {
    kind: 'executeBatch',
    batchKey,
  }
}


import { Middleware } from "./middleware"
import { GeneratorFunction } from "../generator"
import {call, execute, fork, Run, Call, isCall} from '../cuillere'

interface BatchOptions {
  timeout?: number
}

export const batchMiddelware = ({ timeout }: BatchOptions = {}): Middleware =>
  function* batchMiddelware(operation, ctx: Context, next) {
    if(!ctx[BATCH_CTX]) ctx[BATCH_CTX] = new Map<any, BatchEntry>()

    if(isBatchedCall(operation)) {
      let entry: any
      if(ctx[BATCH_CTX].has(operation.func)) {
        entry = ctx[BATCH_CTX].get(operation.func)
      } else {
        console.log('create fork')
        entry = { resolves: [], args: [], }
        ctx[BATCH_CTX].set(operation.func, entry)
        entry.fork = yield fork(call(delayBatchExecution, operation.func, timeout))
      }

      entry.args.push(operation.args)
      return new Promise(resolve => entry.resolves.push(resolve))
    }

    if(isExecuteBatch(operation)) {
      const entry = ctx[BATCH_CTX].get(operation.func)
      ctx[BATCH_CTX].delete(operation.func)
      const result = yield execute(operation.func(...entry.args))
      entry.resolves.forEach((resolve, i) => resolve(result[i]))
      return
    }

    return yield next(operation)
  }

const IS_BATCHED = Symbol('IS_BATCHED')
const BATCH_CTX = Symbol('BATCH_CTX')

interface Context {
  [BATCH_CTX]?: Map<any, BatchEntry>
}

const isBatchedCall = (operation: any): operation is Call =>
  isCall(operation) && operation.func[IS_BATCHED]

export const batched = <T extends GeneratorFunction>(func: T): T => {
  func[IS_BATCHED] = true
  return func
}

const EXECUTE_BATCH = Symbol('EXECUTE_BATCH')

interface ExecuteBatch {
  [EXECUTE_BATCH]: true,
  func: any
}

const isExecuteBatch = (operation: any): operation is ExecuteBatch =>
  operation && operation[EXECUTE_BATCH]

const executeBatch = (fn): ExecuteBatch => ({
  [EXECUTE_BATCH]: true,
  func: fn
})

interface BatchEntry {
  fork: Run
  resolves: ((res: any) => void)[]
  args: any[][]
}

async function* delayBatchExecution(func: GeneratorFunction, delay?: number) {
  await new Promise(resolve =>  delay ? setTimeout(resolve, delay) : setImmediate(resolve))
  yield executeBatch(func)
}

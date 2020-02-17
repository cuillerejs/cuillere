import { unrecognizedOperation } from './errors'
import { contextMiddleware, executeMiddleware, concurrentMiddleware, Middleware, call, execute } from './middlewares'

const START = Symbol('START')

interface Start {
  [START]: true,
  operation: any,
}

function start(operation: any): Start {
  return {
    [START]: true,
    operation,
  }
}

export function isStart(operation: any): operation is Start {
  return operation && operation[START]
}

const NEXT = Symbol('NEXT')

interface Next {
  [NEXT]: true,
  operation: any,
}

function next(operation: any): Next {
  return {
    [NEXT]: true,
    operation,
  }
}

function isNext(operation: any): operation is Next {
  return operation && operation[NEXT]
}

const CALL = Symbol('CALL')

export interface Call {
  [CALL]: true
  func: GeneratorFunction
  args?: any[]
  fork?: true
}

export function isCall(operation: any): operation is Call {
  return Boolean(operation && operation[CALL])
}

export function call(func: GeneratorFunction, ...args: any[]): Call {
  return { [CALL]: true, func, args }
}

export function fork(func: GeneratorFunction, ...args: any[]): Call {
  return { [CALL]: true, func, args, fork: true }
}

export interface OperationHandler {
  (operation: any): Promise<any>
}

export interface Cuillere {
  ctx: (ctx: any) => Cuillere
  start: OperationHandler
  call: <Args extends any[], R>(func: GeneratorFunc<Args, R>, ...args: Args) => Promise<any>
  execute: <R>(gen: Generator<R>) => Promise<any>
}

type StackFrame = {
  gen: Generator | AsyncGenerator
  mwIndex?: number
  hasThrown: boolean
  res?: any
  err?: any
}

export default function cuillere(...middlewares: Middleware[]): Cuillere {
  middlewares.forEach((mw, index) => {
    if (typeof mw !== 'function') {
      throw TypeError(`middlewares[${index}] should be a function: ${mw}`)
    }
  })

  const mws = [
    ...middlewares,
    concurrentMiddleware(),
    executeMiddleware(),
    contextMiddleware(),
  ]

  const make = (pCtx?: any) => {
    const ctx = pCtx || {}

    const run: OperationHandler = async operation => {
      const stack: StackFrame[] = [
        {
          // FIXME check mws isn't empty
          gen: mws[0](operation, ctx, next),
          mwIndex: 0,
          hasThrown: false,
        }
      ]

      let current: IteratorResult<any>

      while (stack.length !== 0) {
        const [curFrame, prevFrame] = stack

        try {
          current = await (curFrame.hasThrown ? curFrame.gen.throw(curFrame.err) : curFrame.gen.next(curFrame.res))
        } catch (e) {
          prevFrame.err = e
          prevFrame.hasThrown = true
          stack.shift()
          continue
        }

        if (current.done) {
          prevFrame.res = current.value
          prevFrame.hasThrown = false
          stack.shift()
          continue
        }

        if (!isNext(current.value)) {
          stack.unshift({
            gen: mws[0](current.value, ctx, next),
            mwIndex: 0,
            hasThrown: false,
          })
          continue
        }

        if (curFrame.mwIndex + 1 < mws.length) {
          stack.unshift({
            gen: mws[curFrame.mwIndex + 1](current.value.operation, ctx, next),
            mwIndex: curFrame.mwIndex + 1,
            hasThrown: false,
          })
          continue
        }

        if (isStart(current.value.operation)) {
          stack.unshift({
            gen: mws[0](current.value.operation.operation, ctx, next),
            mwIndex: 0,
            hasThrown: false,
          })
          continue
        }

        if (isCall(current.value.operation)) {
          stack.unshift({
            gen: current.value.operation.func(...current.value.operation.args),
            hasThrown: false,
          })
          continue
        }

        throw unrecognizedOperation(operation)
      }
    }

    const cllr: Cuillere = {
      ctx: make,
      start: operation => run(start(operation)),
      call: (func, ...args) => cllr.start(call(func, ...args)),
      execute: gen => cllr.start(execute(gen)),
    }

    return cllr
  }

  return make()
}

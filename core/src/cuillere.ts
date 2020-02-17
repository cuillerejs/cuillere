import { unrecognizedOperation } from './errors'
import { contextMiddleware, executeMiddleware, concurrentMiddleware, Middleware, call, execute } from './middlewares'
import { GeneratorFunc } from './generator'

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
  mwIndex: number
  current?: IteratorResult<any>
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
          gen: mws[0](operation, ctx, next),
          mwIndex: 0,
          hasThrown: false,
        }
      ]

      while (stack.length !== 0) {
        const [frame, previousFrame] = stack

        try {
          frame.current = await (frame.hasThrown ? frame.gen.throw(frame.err) : frame.gen.next(frame.res))
        } catch (e) {
          previousFrame.err = e
          previousFrame.hasThrown = true
          stack.shift()
          continue
        }

        if (frame.current.done) {
          previousFrame.res = frame.current.value
          previousFrame.hasThrown = false
          stack.shift()
          continue
        }
        
        try {
          frame.res = await run(frame.current.value) // FIXME manage next (unshift)
          frame.hasThrown = false
        } catch (e) {
          frame.err = e
          frame.hasThrown = true
        }
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

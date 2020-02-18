import { error, unrecognizedOperation } from './errors'
import { Middleware } from './middlewares'
import { isGenerator } from './generator'

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
  func: any
  args?: any[]
  fork?: true
}

export function isCall(operation: any): operation is Call {
  return Boolean(operation && operation[CALL])
}

export function call(func: any, ...args: any[]): Call {
  return { [CALL]: true, func, args }
}

export function fork(func: any, ...args: any[]): Call {
  return { [CALL]: true, func, args, fork: true }
}

const EXECUTE = Symbol('EXECUTE')

export interface Execute<R> {
  [EXECUTE]: true
  gen: Generator<R>
}

export function isExecute(operation: any): operation is Execute<any> {
  return Boolean(operation && operation[EXECUTE])
}

export function execute<R>(gen: Generator<R>): Execute<R> {
  return { [EXECUTE]: true, gen }
}

export interface OperationHandler {
  (operation: any): Promise<any>
}

export interface Cuillere {
  ctx: (ctx: any) => Cuillere
  start: OperationHandler
  call: (func: any, ...args: any[]) => Promise<any>
  execute: <R>(gen: Generator<R>) => Promise<any>
}

type StackFrame = {
  gen: Generator | AsyncGenerator
  mwIndex?: number
}

class Stack extends Array<StackFrame> {

  private mws: Middleware[]
  private ctx: any

  constructor(mws: Middleware[], ctx: any) {
    super()
    this.mws = mws
    this.ctx = ctx
  }

  handle(operation: any) {
    this.unshift(this.stackFrameFor(operation))
  }

  private stackFrameFor(operation: any): StackFrame {
    if (isNext(operation)) {
      const nextMwIndex = this[0]?.mwIndex === undefined ? undefined : this[0].mwIndex + 1

      if (nextMwIndex === undefined || nextMwIndex === this.mws.length)
        return this.fallbackStackFrameFor(operation.operation)
  
      return {
        gen: this.mws[nextMwIndex](operation.operation, this.ctx, next),
        mwIndex: nextMwIndex,
      }
    }

    if (this.mws.length === 0) return this.fallbackStackFrameFor(operation)

    return {
      gen: this.mws[0](operation, this.ctx, next),
      mwIndex: 0,
    }
  }

  private fallbackStackFrameFor(operation: any): StackFrame {
    if (isStart(operation)) return this.stackFrameFor(operation.operation)

    if (!isExecute(operation) && !isCall(operation)) throw unrecognizedOperation(operation)

    let gen: any

    if (isExecute(operation)) {
      // FIXME improve error message
      if (!isGenerator(operation.gen)) throw error('gen should be a generator')

      gen = operation.gen
    } else {
      // FIXME improve error message
      if (!operation.func) throw error('the call operation function is null or undefined')

      gen = operation.func(...operation.args)

      // FIXME improve error message
      if (!isGenerator(gen)) throw error('the call operation function should return a Generator. You probably used `function` instead of `function*`')
    }

    return {
      gen,
    }
  }
}

export default function cuillere(...mws: Middleware[]): Cuillere {
  mws.forEach((mw, index) => {
    if (typeof mw !== 'function') {
      throw TypeError(`middlewares[${index}] should be a function: ${mw}`)
    }
  })

  const make = (pCtx?: any) => {
    const ctx = pCtx || {}
    
    const run: OperationHandler = async operation => {
      const stack = new Stack(mws, ctx)

      stack.handle(operation)

      let current: IteratorResult<any>
      let hasThrown: boolean
      let res: any, err: any

      while (stack.length !== 0) {
        const [curFrame] = stack

        try {
          current = await (hasThrown ? curFrame.gen.throw(err) : curFrame.gen.next(res))
        } catch (e) {
          hasThrown = true
          err = e
          stack.shift()
          continue
        }

        if (current.done) {
          hasThrown = false
          res = current.value
          stack.shift()
          continue
        }

        stack.handle(current.value)
      }

      if (hasThrown) throw err

      return res
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

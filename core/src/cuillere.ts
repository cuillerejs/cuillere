import { error, unrecognizedOperation, CanceledError } from './errors'
import { Middleware } from './middlewares'
import { GeneratorFunction, isGenerator } from './generator'

const START = Symbol('START')

interface Start {
  [START]: true
  operation: any
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
  [NEXT]: true
  operation: any
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

const FORK = Symbol('FORK')

interface Fork {
  [FORK]: true
  operation: any
}

export function fork(func: GeneratorFunction, ...args: any[]): Fork
export function fork(operation: any): Fork
export function fork(firstArg: any, ...args: any[]): Fork {
  return {
    [FORK]: true,
    operation: typeof firstArg === 'function' ? call(firstArg, ...args) : firstArg,
  }
}

export function isFork(operation: any): operation is Fork {
  return operation && operation[FORK]
}

export async function cancel(run: Run): Promise<void> {
  run.cancelled = true // eslint-disable-line no-param-reassign

  try {
    await run.result
  } catch (e) {
    if (e !== CanceledError) console.error('fork did not cancel properly')
  }
}

const CALL = Symbol('CALL')

export interface Call {
  [CALL]: true
  func: GeneratorFunction
  args?: any[]
  location: string
}

export function isCall(operation: any): operation is Call {
  return Boolean(operation && operation[CALL])
}

function getLocation(): string {
  return Error().stack.split('\n')[3].trim().slice(3)
}

export function call(func: GeneratorFunction, ...args: any[]): Call {
  return { [CALL]: true, func, args, location: getLocation() }
}

const EXECUTE = Symbol('EXECUTE')

export interface Execute {
  [EXECUTE]: true
  gen: Generator | AsyncGenerator
}

export function isExecute(operation: any): operation is Execute {
  return Boolean(operation && operation[EXECUTE])
}

export function execute(gen: Generator | AsyncGenerator): Execute {
  return { [EXECUTE]: true, gen }
}

export interface Cuillere {
  ctx: (ctx: any) => Cuillere
  start: (operation: any) => Promise<any>
  call: (func: any, ...args: any[]) => Promise<any>
  execute: (gen: Generator | AsyncGenerator) => Promise<any>
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

      if (nextMwIndex === undefined || nextMwIndex === this.mws.length) {
        return this.fallbackStackFrameFor(operation.operation)
      }

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

export interface Run {
  result?: Promise<any>
  cancelled?: true
}

export default function cuillere(...mws: Middleware[]): Cuillere {
  mws.forEach((mw, index) => {
    if (typeof mw !== 'function') {
      throw TypeError(`middlewares[${index}] should be a function*: ${mw}`)
    }
  })

  const make = (pCtx?: any) => {
    const ctx = pCtx || {}

    const run = (operation: any) => {
      const run: Run = {}

      run.result = doRun(operation, () => run.cancelled)

      return run
    }

    const doRun = async (operation: any, isCancelled: () => boolean) => {
      const stack = new Stack(mws, ctx)

      stack.handle(operation)

      let current: IteratorResult<any>
      let res: any
      let isError: boolean

      while (stack.length !== 0) {
        const [curFrame] = stack

        try {
          if (isCancelled()) {
            await curFrame.gen.return(undefined)
            stack.shift()
            continue
          }

          current = await (isError ? curFrame.gen.throw(res) : curFrame.gen.next(res))
          isError = false
        } catch (e) {
          isError = true
          res = e
          stack.shift()
          continue
        }

        if (current.done) {
          res = current.value
          stack.shift()
          continue
        }

        if (isFork(current.value)) {
          res = run(current.value.operation)
          continue
        }

        stack.handle(current.value)
      }

      if (isCancelled()) throw CanceledError

      if (isError) throw res

      return res
    }

    const cllr: Cuillere = {
      ctx: make,
      start: operation => run(start(operation)).result,
      call: (func, ...args) => cllr.start(call(func, ...args)),
      execute: gen => cllr.start(execute(gen)),
    }

    return cllr
  }

  return make()
}

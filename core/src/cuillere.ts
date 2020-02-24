import { error, unrecognizedOperation, CancellationError } from './errors'
import { Middleware, concurrentMiddleware, contextMiddleware } from './middlewares'
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

enum Canceled {
  ToDo = 1,
  Done,
}

type StackFrame = {
  gen: Generator | AsyncGenerator
  mwIndex?: number
  canceled?: Canceled
}

class Stack extends Array<StackFrame> {
  #mws: Middleware[]

  #ctx: any

  constructor(mws: Middleware[], ctx: any) {
    super()
    this.#mws = mws
    this.#ctx = ctx
  }

  handle(operation: any) {
    this.unshift(this.stackFrameFor(operation))
  }

  private stackFrameFor(operation: any): StackFrame {
    if (isNext(operation)) {
      const nextMwIndex = this[0]?.mwIndex === undefined ? undefined : this[0].mwIndex + 1

      if (nextMwIndex === undefined || nextMwIndex === this.#mws.length) {
        return this.fallbackStackFrameFor(operation.operation)
      }

      return {
        gen: this.#mws[nextMwIndex](operation.operation, this.#ctx, next),
        mwIndex: nextMwIndex,
      }
    }

    if (this.#mws.length === 0) return this.fallbackStackFrameFor(operation)

    return {
      gen: this.#mws[0](operation, this.#ctx, next),
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

export class Run {
  #ctx: any

  #mws: Middleware[]

  #stack: Stack

  #result: Promise<any>

  #settled = false

  #canceled = false

  constructor(mws: Middleware[], ctx: any, operation: any) {
    this.#mws = mws
    this.#ctx = ctx

    this.#stack = new Stack(mws, ctx)
    this.#stack.handle(operation)

    this.#result = this.doRun().finally(() => { this.#settled = true })
  }

  private async doRun(): Promise<any> {
    let current: IteratorResult<any>
    let res: any
    let isError: boolean

    while (this.#stack.length !== 0) {
      const [curFrame] = this.#stack

      try {
        if (!curFrame.canceled || curFrame.canceled === Canceled.Done) {
          current = await (isError ? curFrame.gen.throw(res) : curFrame.gen.next(res))
        } else {
          curFrame.canceled = Canceled.Done
          current = await curFrame.gen.return(undefined)
        }
        isError = false
      } catch (e) {
        isError = true
        res = e
        this.#stack.shift()
        continue
      }

      if (current.done) {
        res = current.value
        this.#stack.shift()
        continue
      }

      if (curFrame.canceled === Canceled.ToDo) continue

      if (isFork(current.value)) {
        res = new Run(this.#mws, this.#ctx, current.value.operation)
        continue
      }

      this.#stack.handle(current.value)
    }

    if (this.#canceled) throw new CancellationError()

    if (isError) throw res

    return res
  }

  get result() {
    return this.#result
  }

  get settled() {
    return this.#settled
  }

  async cancel() {
    if (this.#settled) return

    if (this.#canceled) {
      await this.#result
      return
    }

    this.#canceled = true
    this.#stack.forEach((sf) => { sf.canceled = Canceled.ToDo })

    try {
      await this.#result
    } catch (e) {
      if (!CancellationError.isCancellationError(e)) console.error('fork did not cancel properly')
    }
  }
}

export default function cuillere(...pMws: Middleware[]): Cuillere {
  pMws.forEach((mw, index) => {
    if (typeof mw !== 'function') {
      throw TypeError(`middlewares[${index}] should be a function*: ${mw}`)
    }
  })

  const mws = pMws.concat([
    concurrentMiddleware(),
    contextMiddleware(),
  ])

  const make = (pCtx?: any) => {
    const ctx = pCtx || {}

    const cllr: Cuillere = {
      ctx: make,
      start: operation => new Run(mws, ctx, start(operation)).result,
      call: (func, ...args) => cllr.start(call(func, ...args)),
      execute: gen => cllr.start(execute(gen)),
    }

    return cllr
  }

  return make()
}

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
  return Boolean(operation?.[START])
}

const TERMINATE = Symbol('TERMINATE')

interface Terminate {
  [TERMINATE]: true
  operation: any
}

function terminate(operation: any): Terminate {
  return {
    [TERMINATE]: true,
    operation,
  }
}

function isTerminate(operation: any): operation is Terminate {
  return Boolean(operation?.[TERMINATE])
}

const NEXT = Symbol('NEXT')

interface Next {
  [NEXT]: true
  operation: any
}

export function next(operation: any): Next {
  return {
    [NEXT]: true,
    operation,
  }
}

function isNext(operation: any): operation is Next {
  return Boolean(operation?.[NEXT])
}

export function delegate(operation: any) {
  return terminate(next(operation))
}

const FORK = Symbol('FORK')

interface Fork {
  [FORK]: true
  operation: any
}

export function fork(func: GeneratorFunction, ...args: any[]): Fork {
  return forkOperation(call(func, ...args))
}

export function forkOperation(operation: any): Fork {
  return {
    [FORK]: true,
    operation,
  }
}

export function isFork(operation: any): operation is Fork {
  return Boolean(operation?.[FORK])
}

const CALL = Symbol('CALL')

interface Call {
  [CALL]: true
  func: GeneratorFunction
  args?: any[]
  location: string
}

export function isCall(operation: any): operation is Call {
  return Boolean(operation?.[CALL])
}

function getLocation(): string {
  return Error().stack.split('\n')[3].trim().slice(3)
}

export function call(func: GeneratorFunction, ...args: any[]): Call {
  return { [CALL]: true, func, args, location: getLocation() }
}

const EXECUTE = Symbol('EXECUTE')

interface Execute {
  [EXECUTE]: true
  gen: Generator | AsyncGenerator
}

export function isExecute(operation: any): operation is Execute {
  return Boolean(operation?.[EXECUTE])
}

export function execute(gen: Generator | AsyncGenerator): Execute {
  return { [EXECUTE]: true, gen }
}

const DEFER = Symbol('DEFER')

interface Defer {
  [DEFER]: true
  operation: any
}

function isDefer(operation: any): operation is Defer {
  return Boolean(operation?.[DEFER])
}

export function deferOperation(operation: any): Defer {
  return {
    [DEFER]: true,
    operation,
  }
}

export function defer(func: GeneratorFunction, ...args: any[]) {
  return deferOperation(call(func, ...args))
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

interface StackFrame {
  gen: Generator | AsyncGenerator
  isMiddleware: boolean
  mwIndex?: number
  canceled?: Canceled
  defers: any[]
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

  replace(operation: any) {
    this[0] = this.stackFrameFor(operation)
  }

  private stackFrameFor(operation: any): StackFrame {
    if (isNext(operation)) {
      if (!this[0]?.isMiddleware) throw error('next yielded outside of middleware')

      const nextMwIndex = this[0]?.mwIndex === undefined ? undefined : this[0].mwIndex + 1

      if (nextMwIndex === undefined || nextMwIndex === this.#mws.length) {
        return this.fallbackStackFrameFor(operation.operation)
      }

      return {
        gen: this.#mws[nextMwIndex](operation.operation, this.#ctx),
        isMiddleware: true,
        mwIndex: nextMwIndex,
        defers: [],
      }
    }

    if (this.#mws.length === 0) return this.fallbackStackFrameFor(operation)

    return {
      gen: this.#mws[0](operation, this.#ctx),
      isMiddleware: true,
      mwIndex: 0,
      defers: [],
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
      isMiddleware: false,
      defers: [],
    }
  }
}

export class Task {
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

    this.#result = this.execute().finally(() => { this.#settled = true })
  }

  private async execute(): Promise<any> {
    let current: IteratorResult<any>
    let res: any
    let isError: boolean

    while (this.#stack.length !== 0) {
      const [curFrame] = this.#stack

      try {
        if (curFrame.canceled && curFrame.canceled === Canceled.ToDo) {
          curFrame.canceled = Canceled.Done
          current = await curFrame.gen.return(undefined)
        } else {
          current = await (isError ? curFrame.gen.throw(res) : curFrame.gen.next(res))
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

      if (isTerminate(current.value)) {
        if (!curFrame.isMiddleware) throw error('terminal operation yielded outside of middleware')

        try {
          if (!(await curFrame.gen.return(undefined)).done) throw new Error("don't use terminal next inside a try...finally")
        } catch (e) {
          throw error('generator did not terminate properly. Caused by: ', e.stack)
        }

        this.#stack.replace(current.value.operation)

        continue
      }

      if (isFork(current.value)) {
        res = new Task(this.#mws, this.#ctx, current.value.operation)
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

    if (!this.#canceled) {
      this.#canceled = true
      this.#stack.forEach((sf) => { sf.canceled = Canceled.ToDo })
    }

    try {
      await this.#result
    } catch (e) {
      if (CancellationError.isCancellationError(e)) return
      throw error('fork did not cancel properly. Caused by: ', e.stack)
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
      start: operation => new Task(mws, ctx, start(operation)).result,
      call: (func, ...args) => cllr.start(call(func, ...args)),
      execute: gen => cllr.start(execute(gen)),
    }

    return cllr
  }

  return make()
}

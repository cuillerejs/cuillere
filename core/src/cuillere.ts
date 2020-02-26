import { error, unrecognizedOperation, CancellationError } from './errors'
import { Middleware, concurrentMiddleware, contextMiddleware } from './middlewares'
import { isGenerator } from './generator'
import { call, execute, start, isCall, isDefer, isExecute, isFork, isNext, isStart, isTerminal } from './operations'

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
    if (isTerminal(operation)) {
      this[0] = this.stackFrameFor(operation.operation)
    } else {
      this.unshift(this.stackFrameFor(operation))
    }
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

  #current: IteratorResult<any>

  #res: any

  #isError: boolean

  constructor(mws: Middleware[], ctx: any, operation: any) {
    this.#mws = mws
    this.#ctx = ctx

    this.#stack = new Stack(mws, ctx)
    this.#stack.handle(operation)

    this.#result = this.execute().finally(() => { this.#settled = true })
  }

  private async execute(): Promise<any> {
    while (this.#stack.length !== 0) {
      const [curFrame] = this.#stack

      try {
        if (curFrame.canceled && curFrame.canceled === Canceled.ToDo) {
          curFrame.canceled = Canceled.Done
          this.#current = await curFrame.gen.return(undefined)
        } else {
          this.#current = await (
            this.#isError ? curFrame.gen.throw(this.#res) : curFrame.gen.next(this.#res)
          )
        }
        this.#isError = false
      } catch (e) {
        this.#isError = true
        this.#res = e
        await this.shift()
        continue
      }

      if (this.#current.done) {
        this.#res = this.#current.value
        await this.shift()
        continue
      }

      if (curFrame.canceled === Canceled.ToDo) continue

      if (isTerminal(this.#current.value)) {
        try {
          if (!(await curFrame.gen.return(undefined)).done) throw new Error("don't use terminal operation inside a try...finally")
        } catch (e) {
          throw error('generator did not terminate properly. Caused by: ', e.stack)
        }

        if (isFork(this.#current.value.operation)) throw error('terminal forks are forbidden')
        if (isDefer(this.#current.value.operation)) throw error('terminal defers are forbidden')
      }

      if (isFork(this.#current.value)) {
        this.#res = new Task(this.#mws, this.#ctx, this.#current.value.operation)
        continue
      }

      if (isDefer(this.#current.value)) {
        curFrame.defers.unshift(this.#current.value.operation)
        this.#res = undefined
        continue
      }

      this.#stack.handle(this.#current.value)
    }

    if (this.#canceled) throw new CancellationError()

    if (this.#isError) throw this.#res

    return this.#res
  }

  private async shift() {
    const [{ defers }] = this.#stack

    for (const operation of defers) {
      try {
        await new Task(this.#mws, this.#ctx, operation).result
      } catch (e) {
        this.#isError = true
        this.#res = e
      }
    }

    this.#stack.shift()
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

import { Middleware, FilteredHandler } from './middlewares'
import { Stack, Canceled } from './stack'
import { isTerminal, isFork, isDefer } from './operations'
import { error, CancellationError } from './errors'

export class Task {
  #ctx: any

  #mws: Record<string, FilteredHandler[]>

  #stack: Stack

  #result: Promise<any>

  #settled = false

  #canceled = false

  #current: IteratorResult<any>

  #res: any

  #isError: boolean

  constructor(mws: Record<string, FilteredHandler[]>, ctx: any, operation: any) {
    this.#mws = mws
    this.#ctx = ctx

    this.#stack = new Stack(mws, ctx)
    this.#stack.handle(operation)

    this.#result = this.execute().finally(() => { this.#settled = true })
  }

  private async execute(): Promise<any> {
    while (this.#stack.currentFrame) {
      const curFrame = this.#stack.currentFrame

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
    const { defers } = this.#stack.currentFrame

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
      this.#stack.cancel()
    }

    try {
      await this.#result
    } catch (e) {
      if (CancellationError.isCancellationError(e)) return
      throw error('fork did not cancel properly. Caused by: ', e.stack)
    }
  }
}

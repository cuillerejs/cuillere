import { FilteredHandler } from './middlewares'
import { Stack, Canceled } from './stack'
import { isTerminal, Operation, isFork, isDefer, validateOperation } from './operations'
import { error, CancellationError } from './errors'
import { isRecover } from './operations/recover'

export class Task {
  #ctx: any

  #handlers: Record<string, FilteredHandler[]>

  #stack: Stack

  #result: Promise<any>

  #settled = false

  #canceled = false

  #current: IteratorResult<Operation>

  #res: any

  #isError: boolean

  constructor(handlers: Record<string, FilteredHandler[]>, ctx: any, operation: Operation) {
    this.#handlers = handlers
    this.#ctx = ctx

    this.#stack = new Stack(handlers, ctx)

    // FIXME additional validations on start operation
    this.#stack.handle(validateOperation(operation))

    this.#result = this.execute().finally(() => { this.#settled = true })
  }

  async execute(): Promise<any> {
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

      let operation: Operation
      try {
        operation = validateOperation(this.#current.value)
      } catch (e) {
        this.#isError = true
        this.#res = e
        continue
      }

      if (isTerminal(operation)) {
        try {
          // FIXME what should we do if there are defers ? warning ? throw ?
          if (!(await curFrame.gen.return(undefined)).done) throw new Error("don't use terminal operation inside a try...finally")
        } catch (e) {
          throw error('generator did not terminate properly. Caused by: ', e.stack)
        }
      }

      if (isFork(operation)) {
        this.#res = new Task(this.#handlers, this.#ctx, operation.operation)
        continue
      }

      if (isDefer(operation)) {
        curFrame.defers.unshift(operation.operation)
        this.#res = undefined
        continue
      }

      if (isRecover(this.#current.value)) {
        // FIXME
      }

      this.#stack.handle(operation)
    }

    if (this.#canceled) throw new CancellationError()

    if (this.#isError) throw this.#res

    return this.#res
  }

  async shift() {
    const { defers } = this.#stack.currentFrame

    for (const operation of defers) {
      try {
        await new Task(this.#handlers, this.#ctx, operation).result
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

import { FilteredHandler } from './middlewares'
import { Stack, Canceled } from './stack'
import { isTerminal, Operation, isFork, isDefer, validateOperation } from './operations'
import { error, CancellationError } from './errors'

export class Task {
  #ctx: any

  #handlers: Record<string, FilteredHandler[]>

  #stack: Stack

  #result: Promise<any>

  #settled = false

  #canceled = false

  constructor(handlers: Record<string, FilteredHandler[]>, ctx: any, operation: Operation) {
    this.#handlers = handlers
    this.#ctx = ctx

    this.#stack = new Stack(handlers, ctx)

    // FIXME additional validations on start operation
    this.#stack.handle(validateOperation(operation))

    this.#result = this.execute().finally(() => { this.#settled = true })
  }

  async execute() {
    while (this.#stack.currentFrame) {
      let result: IteratorResult<Operation>

      try {
        // FIXME add some tests for defer and finally when canceled
        if (this.#stack.currentFrame.canceled && this.#stack.currentFrame.canceled === Canceled.ToDo) {
          this.#stack.currentFrame.canceled = Canceled.Done
          result = await this.#stack.currentFrame.gen.return(undefined)
        } else {
          result = await (
            this.#stack.currentFrame.result.hasError
              ? this.#stack.currentFrame.gen.throw(this.#stack.currentFrame.result.error)
              : this.#stack.currentFrame.gen.next(this.#stack.currentFrame.result.value))
        }

        this.#stack.currentFrame.result = { hasError: false }
      } catch (e) {
        this.#stack.currentFrame.result = { hasError: true, error: e }
        this.#stack.currentFrame.done = true
        this.#stack.shift()
        continue
      }

      if (result.done) {
        this.#stack.currentFrame.result.value = result.value
        this.#stack.currentFrame.done = true
        this.#stack.shift()
        continue
      }

      if (this.#stack.currentFrame.canceled === Canceled.ToDo) continue

      let operation: Operation
      try {
        operation = validateOperation(result.value)
      } catch (e) {
        this.#stack.currentFrame.result = { hasError: true, error: e }
        continue
      }

      if (isTerminal(operation)) {
        // FIXME should throw in previous stackFrame
        try {
          // FIXME what should we do if there are defers ? warning ? throw ?
          if (!(await this.#stack.currentFrame.gen.return(undefined)).done) throw new Error("don't use terminal operation inside a try...finally")
        } catch (e) {
          throw error('generator did not terminate properly. Caused by: ', e.stack)
        }
      }

      if (isFork(operation)) {
        this.#stack.currentFrame.result.value = new Task(this.#handlers, this.#ctx, operation.operation)
        continue
      }

      if (isDefer(operation)) {
        this.#stack.currentFrame.defers.unshift(operation.operation)
        continue
      }

      try {
        this.#stack.handle(operation)
      } catch (e) {
        // FIXME mutualize with try...catch of validateOperation ?
        this.#stack.currentFrame.result = { hasError: true, error: e }
        continue
      }
    }

    if (this.#canceled) {
      throw new CancellationError()
    }

    if (this.#stack.result.hasError) throw this.#stack.result.error

    return this.#stack.result.value
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
      // This should not happen
      throw error('fork did not cancel properly. Caused by: ', e.stack)
    }
  }
}

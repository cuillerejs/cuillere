import { FilteredHandler } from './middlewares'
import { Stack } from './stack'
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
    for await (const value of this.#stack) {
      let operation: Operation
      try {
        operation = validateOperation(value)
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

import type { Handler } from './plugin'
import { type Generator, isGenerator } from './generator'
import { type Operation, isOperation } from './operation'

export class Runner<R> {
  result: Promise<any>

  private handlers: Record<string, Handler>

  private context: any

  private generator: Generator<R, Operation>

  private canceled?: Canceled

  private settled = false

  constructor(
    handlers: Record<string, Handler>,
    context: any,
    generator: Generator<R, Operation>,
  ) {
    if (!isGenerator(generator)) {
      let message = `${typeof generator} value is not a Generator`
      if (typeof generator === 'function') {
        message += '. Did you forget to call the function?'
      } else if (typeof generator === 'object' && generator !== null) {
        if (generator as object instanceof Promise) {
          message += '. Did you used yield instead of await?'
        } else if (generator['kind']) {
          message += '. You probably called an operation factory instead of a generator function'
        }
      }
      throw new TypeError(message)
    }

    this.handlers = handlers
    this.context = context
    this.generator = generator
  }

  async run(): Promise<R> {
    try {
      let result = await this.generator.next()

      while (result.done !== true) {
        let operationResult: unknown
        let hasThrown = false

        if (this.canceled === Canceled.ToDo) {
          this.canceled = Canceled.Done
          result = await this.generator.return(undefined)
          continue
        }

        try {
          operationResult = await this.handle(result.value)
        } catch (err) {
          operationResult = err
          hasThrown = true
        }

        // @ts-ignore: ts(2637) shitty type assertion
        if (this.canceled === Canceled.ToDo) {
          this.canceled = Canceled.Done
          result = await this.generator.return(undefined)
          continue
        }

        if (hasThrown) {
          result = await this.generator.throw(operationResult)
        } else {
          result = await this.generator.next(operationResult)
        }
      }

      if (this.canceled) throw new Error('canceled')

      return result.value
    } finally {
      this.settled = true
    }
  }

  execute = <R>(generator: Generator<R, Operation>): Runner<R> => new Runner(this.handlers, this.context, generator)

  async handle(operation: Operation) {
    if (!isOperation(operation)) {
      let message = `${typeof operation} value is not an operation`
      if (typeof operation === 'object' && operation !== null) {
        if (isGenerator(operation)) {
          message += ". You probably used 'yield myFunction()' instead of 'yield* myFunction()'"
        } else {
          console.warn('unknow object', operation)
        }
      } else {
        console.warn('unknow type', operation)
      }
      throw new TypeError(message)
    }

    if (!this.handlers[operation.kind]) {
      throw new Error(`no handler defined for "${operation.kind}" operation kind`)
    }

    const result = this.handlers[operation.kind](operation, this.context, this.execute)

    if (isGenerator(result)) {
      throw TypeError(`handler for "${operation.kind}" returned a generator instead of a value or a promise. Handlers can't be generator functions, use third handler parameter (execute) to execute an operation withim the same execution context`)
    }

    return result
  }

  cancel() {
    if (this.settled) return

    if (!this.canceled) {
      this.canceled = Canceled.ToDo
    }

    // FIXME do we need to return a Promise?
  }
}

enum Canceled {
  ToDo = 1,
  Done,
}

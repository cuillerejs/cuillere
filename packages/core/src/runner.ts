import type { Handler } from './plugin'
import type { Cuillere } from './cuillere'
import { type Generator, isGenerator } from './generator'
import { type Operation, isOperation } from './operation'

export class Runner<R> {
  result: Promise<any>

  private handlers: Record<string, Handler>

  private context: any

  private generator: Generator<R, Operation>

  private canceled?: Canceled

  private settled = false

  private cllr: Cuillere

  constructor(
    handlers: Record<string, Handler>,
    context: any,
    generator: Generator<R, Operation>,
    cllr: Cuillere,
  ) {
    if (!isGenerator(generator)) {
      throw new TypeError(`${typeof generator} value is not a Generator`)
    }

    this.handlers = handlers
    this.context = context
    this.generator = generator
    this.cllr = cllr
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

  execute = <R>(generator: Generator<R, Operation>): Runner<R> => new Runner(this.handlers, this.context, generator, this.cllr)

  async handle(operation: Operation) {
    if (!isOperation(operation)) {
      throw new TypeError(`${typeof operation} value is not an operation`)
    }

    if (!this.handlers[operation.kind]) {
      throw new Error(`no handler defined for "${operation.kind}" operation kind`)
    }

    return this.handlers[operation.kind](operation, this.context, this.execute)
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

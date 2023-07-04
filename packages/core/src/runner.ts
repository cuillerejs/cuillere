import { type Generator } from './generator'
import { type Operation, isOperation } from './operation'

export class Runner<R> {
  result: Promise<any>

  private handlers: Record<string, ((operation: Operation, context: any) => unknown)>

  private context: any

  private generator: Generator<R, Operation>

  private canceled?: Canceled

  private settled = false

  constructor(
    handlers: Record<string, ((operation: Operation, context: any) => unknown)>,
    context: any,
    generator: Generator<R, Operation>,
  ) {
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

  async handle(operation: Operation) {
    if (!isOperation(operation)) {
      throw new TypeError(`${operation} is not a valid operation`)
    }

    if (!this.handlers[operation.kind]) {
      throw new Error(`no handler defined for "${operation.kind}" operation kind`)
    }

    return this.handlers[operation.kind](operation, this.context)
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

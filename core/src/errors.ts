const formatMessage = (message: string, ...args: any[]) => `cuillere: ${message}${args.map(arg => JSON.stringify(arg, null, 2)).join(' ')}`

export const error = (message: string, ...args: any[]) => new Error(formatMessage(message, ...args))

class UnrecognizedOperationError extends TypeError {
  operation: any

  constructor(operation: any) {
    super(formatMessage('operation could not be handled, misformed operation or missing middleware'))
    this.operation = operation
  }
}

export const unrecognizedOperation = (operation: any) => new UnrecognizedOperationError(operation)

export class CancellationError extends Error {
  constructor() {
    super('Canceled')
    this[CancellationError.CANCELED] = true
  }

  private static CANCELED = Symbol('CANCELED')

  static isCancellationError(e: any): e is CancellationError {
    return e[CancellationError.CANCELED]
  }
}

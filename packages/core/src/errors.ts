export const captured = Symbol('captured')

const formatMessage = (message: string, ...args: any[]) => `cuillere: ${message}${args.map(arg => JSON.stringify(arg, null, 2)).join(' ')}`

// FIXME delete this ?
export const error = (message: string, ...args: any[]) => new Error(formatMessage(message, ...args))

// FIXME export and rename to UnhandledEffectError
class UnrecognizedEffectError extends TypeError {
  effect: any

  constructor(effect: any) {
    super(`no handler defined for this knind of effect: ${effect?.kind ?? typeof effect}`)
    this.effect = effect
  }
}

// FIXME delete this
export const unrecognizedEffect = (effect: any) => new UnrecognizedEffectError(effect)

export class CancellationError extends Error {
  constructor() {
    super('Canceled')
    this[CancellationError.CANCELED] = true
  }

  private static CANCELED = Symbol('CANCELED')

  // FIXME replace by instanceof?
  static isCancellationError(e: any): e is CancellationError {
    return e[CancellationError.CANCELED]
  }
}

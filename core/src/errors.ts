const UNRECOGNIZED_ERROR = Symbol('UNRECOGNIZED_ERROR')

export function error(message: string, ...args): Error {
  return new Error(
    `[CUILLERE] Error: ${message}${args.map(arg => JSON.stringify(arg, null, 2)).join(' ')}`,
  )
}

export const isUnrecognizedOperation = (err: Error) => err[UNRECOGNIZED_ERROR]
export const unrecognizedOperation = (operation: any) => {
  const err = error('operation could not be handled, misformed operation or missing middleware')
  err[UNRECOGNIZED_ERROR] = true
  err['operation'] = operation
  return err
}

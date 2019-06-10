const UNRECOGNIZED_ERROR = Symbol('UNRECOGNIZED_ERROR')

export function error(message: string, ...args): Error {
  return new Error(
    `[CUILLERE] Error : ${message} ${args.map(arg => JSON.stringify(arg, null, 2)).join(' ')}`,
  )
}

export const isUnrecognizedOperation = (err: Error) => err[UNRECOGNIZED_ERROR]
export const unrecognizedOperation = (operation: any) => {
  const err = error(
    'the operation had not been handle by any middleware. You probably used a missformed operation or forgotten to add a middleware :',
    operation,
  )
  err[UNRECOGNIZED_ERROR] = true
  return err
}

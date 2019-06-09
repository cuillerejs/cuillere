/* eslint-disable no-await-in-loop */

import {
  Operation,
  isOperation,
  isCallOperation,
  isCrudOperation,
  CallOperation,
  CrudOperation,
} from './operations'

function error(message: string): Error {
  return new Error(`Database operation error : ${message}`)
}

export function run(operation: Operation): any {
  if (!isOperation(operation)) throw error('given argument is not a DB Operation')

  if (isCallOperation(operation)) return runCallOperation(operation)
  if (isCrudOperation(operation)) return runCrudOperation(operation)

  throw error(`unknown operation type '${operation.type}'`)
}

async function runCallOperation(operation: CallOperation) {
  if (!operation.func) throw error('call operation needs a function')

  const runningOperation = operation.func(...operation.args)

  if (!runningOperation.next) throw error('call operation function should return an iterator')

  let current = runningOperation.next()
  while (!current.done) {
    if (!isOperation(current.value)) {
      throw error('call operation function should only yield Operation')
    }
    current = runningOperation.next(await run(current.value))
  }

  return isOperation(current.value) ? run(current.value) : current.value
}

async function runCrudOperation(operation: CrudOperation) {
  if (!operation.method) throw error('crud operation needs a method name')

  throw error('not implemented')
}

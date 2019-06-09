/* eslint-disable no-await-in-loop */
import {
  Operation,
  isOperation,
  isCallOperation,
  isCrudOperation,
  CallOperation,
  CrudOperation,
} from './operations'
import { Context } from './context'

function error(message: string): Error {
  return new Error(`Database operation error : ${message}`)
}

type Runner<O extends Operation> = (operation: O, ctx: Context) => Promise<any>

export const run: Runner<Operation> = (operation, ctx) => {
  if (!isOperation(operation)) throw error('given argument is not a DB Operation')

  if (isCallOperation(operation)) return runCallOperation(operation, ctx)
  if (isCrudOperation(operation)) return runCrudOperation(operation, ctx)

  throw error(`unknown operation type '${operation.type}'`)
}

const runCallOperation: Runner<CallOperation> = async (operation, ctx) => {
  if (!operation.func) throw error('call operation needs a function')

  const runningOperation = operation.func(...operation.args)

  if (!runningOperation.next) throw error('call operation function should return an iterator')

  let current = runningOperation.next()
  while (!current.done) {
    if (!isOperation(current.value)) {
      throw error('call operation function should only yield Operation')
    }
    current = runningOperation.next(await run(current.value, ctx))
  }

  return isOperation(current.value) ? run(current.value, ctx) : current.value
}

const runCrudOperation: Runner<CrudOperation> = async (operation, ctx) => {
  if (!operation.method) throw error('crud operation needs a method name')

  const service = ctx.getService(operation.service)
  if (!service) throw error(`service ${operation.service} not found in context`)

  const method = service[operation.method]
  if (!method) throw error(`method ${operation.method} not found in service ${operation.service}`)

  return method(...operation.args)
}

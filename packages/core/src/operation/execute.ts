import { coreNamespace } from './core-namespace'
import { Effect } from '../effect'
import { Operation } from './operation'
import { Generator } from '../generator'

const kind = `${coreNamespace}/execute`

export interface ExecuteOperation<R = any> extends Operation {
  gen: Generator<R, Effect>
}

export function execute<R = any>(gen: Generator<R, Effect>): ExecuteOperation {
  return { kind, gen }
}

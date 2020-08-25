import { Operation, OperationObject, coreNamespace } from './operation'
import { Generator } from '../generator'

const kind = `${coreNamespace}/execute`

export interface Execute<R = any> extends OperationObject {
  gen: Generator<R, Operation>
}

export function execute<R = any>(gen: Generator<R, Operation>): Execute {
  return { kind, gen }
}

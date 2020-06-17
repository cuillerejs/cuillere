import { Operation, OperationObject } from './operation'
import { Generator } from '../generator'

export interface Execute<R = any> extends OperationObject {
  gen: Generator<R, Operation>
}

export function execute<R = any>(gen: Generator<R, Operation>): Execute {
  return {
    kind: 'execute',
    gen,
  }
}

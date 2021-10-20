import { Generator } from '../generator'
import { OperationObject } from './operation'
import { terminal } from './terminal'
import { generator } from './generator'

function* callableGenerator() {
  yield terminal(yield generator())
}

export function callable<Args extends any[] = any[], T extends OperationObject = OperationObject>(
  factory: (...args: Args) => T,
): (...args: Args) => T & Generator<void, OperationObject> {
  return (...args: Args) => Object.assign(callableGenerator(), factory(...args))
}

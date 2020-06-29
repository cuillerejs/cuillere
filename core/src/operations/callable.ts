import { Generator } from '../generator'
import { OperationObject } from './operation'
import { terminal } from './terminal'
import { generator } from './generator'

function* callableGenerator() {
  yield terminal(yield generator())
}

type Callable<Args extends any[] = any[], T extends OperationObject = OperationObject> = (...args: Args) => T & Generator<void, OperationObject>

export function callable<Args extends any[] = any[], T extends OperationObject = OperationObject>(factory: (...args: Args) => T): Callable<Args, T> {
  return (...args: Args) => Object.assign(callableGenerator(), factory(...args))
}

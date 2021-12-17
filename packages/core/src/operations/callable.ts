import { Generator } from '../generator'
import { Operation } from './operation'
import { terminal } from './terminal'
import { generator } from './generator'

function* callableGenerator() {
  yield terminal(yield generator())
}

export function callable<Args extends any[] = any[], T extends Operation = Operation>(
  factory: (...args: Args) => T,
): (...args: Args) => T & Generator<void, Operation> {
  return (...args: Args) => Object.assign(callableGenerator(), factory(...args))
}

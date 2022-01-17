import { Generator } from '../generator'
import { Operation } from './operation'
import { terminal } from './terminal'
import { generator } from './generator'

function* callableGenerator() {
  yield terminal(yield generator())
}

/**
 * Wraps an operation factory to make it [[call | callable]].
 *
 * @param factory Operation factory to be wrapped.
 * @typeParam Args Factory's arguments type.
 * @typeParam T Operation type returned by the factory.
 * @returns A new function with the same signature as `factory`.
 */
export function callable<Args extends any[] = any[], T extends Operation = Operation>(
  factory: (...args: Args) => T,
): (...args: Args) => T & Generator<void, Operation> {
  return (...args: Args) => Object.assign(callableGenerator(), factory(...args))
}

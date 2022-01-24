import type { Generator } from '../generator'
import { generator } from './generator'
import type { Operation } from './operation'
import { terminal } from './terminal'

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
): (...args: Args) => T & Generator<void> {
  return (...args: Args) => Object.assign(callableGenerator(), factory(...args))
}

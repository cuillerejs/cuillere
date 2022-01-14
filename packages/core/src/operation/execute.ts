import { CORE_NAMESPACE } from '../core-namespace'
import { Effect } from '../effect'
import { Operation } from './operation'
import { Generator } from '../generator'

/**
 * An operation to execute a given generator when yielded.
 *
 * @category for operations
 * @typeParam R Return type of the generator.
 * @hidden
 */
export interface ExecuteOperation<R = any> extends Operation {

  /**
   * The generator to be executed.
   */
  gen: Generator<R, Effect>
}

/**
 * Executes a generator.
 *
 * ⚠ DO NOT USE THIS OPERATION.
 *
 * This internal operation is used to wrap yielded generators when at least one plugin registrered a handler for `"@cuillere/core/execute"`.
 *
 * @param gen The generator to be executed.
 * @returns A new operation to execute the given generator when yielded.
 * @typeParam R Return type of the given generator.
 * @category for creating effects
 * @hidden
 */
export function execute<R = any>(gen: Generator<R, Effect>): ExecuteOperation {
  return { kind: `${CORE_NAMESPACE}/execute`, gen }
}

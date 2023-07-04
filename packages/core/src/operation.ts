/**
 * Base interface for any operation object.
 *
 * An operation object may be yielded as an effect to perform some kind of operation.
 *
 * @category for operations
 */
export type Operation = {

  /**
   * Operation's kind.
   */
  readonly kind: `@${string}`
}

/**
 * Checks if `value` is an [[Operation]].
 *
 * @param value Value to be checked, must not be `null` or `undefined`.
 * @returns `true` if `value` has a property named `kind`.
 */
export function isOperation(value: any): value is Operation {
  return typeof value === 'object' && value !== null && 'kind' in value
}

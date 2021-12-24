/**
 * @category for operations
 */
export interface Operation {
  readonly kind: `@${string}`
}

export function isOperation(value: any): value is Operation {
  return 'kind' in value
}

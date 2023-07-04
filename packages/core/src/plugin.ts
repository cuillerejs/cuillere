import type { Cuillere } from '.'
import type { Operation } from './operation'

/**
 * Interface for a Cuillere plugin.
 *
 * Plugins are responsible for handling operations.
 *
 * @typeParam KindTypeMap Map of operation kind to operation type.
 * @typeParam Context Type of the context for this plugin.
 */
export interface Plugin<KindTypeMap extends Record<string, Operation> = Record<string, Operation>, Context = any> {

  /**
   * This plugin's namespace, must start with `@`, for example `@myPlugin`.
   *
   * It is used as a prefix for this plugin's operations' kind.
   */
  namespace: `@${string}`

  /**
   * A map of operation kinds to handle functions.
   *
   * Example:
   *
   * ```javascript
   * const myPlugin = {
   *   namespace: '@myPlugin',
   *   handlers: {
   *     async foo(operation, context) {
   *       // handle operations of kind @myPlugin/foo
   *     },
   *   },
   * }
   * ```
   */
  handlers: {
    [Kind in keyof KindTypeMap]: <T extends KindTypeMap[Kind]>(operation: T, context: Context, cllr: Cuillere) => unknown
  }

  onStart?: (context: Context) => void
}

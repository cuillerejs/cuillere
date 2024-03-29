import type { Generator } from './generator'
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
   *
   * A plugin may have no namespace if all of its handlers are namespaced.
   */
  namespace?: `@${string}`

  /**
   * A map of operation kinds to handle functions.
   *
   * The operation kind may be namespaced (start with `@`), or not in which case it is implicitly prefixed by the plugin's namespace and `/`.
   *
   * Example:
   *
   * ```javascript
   * const myPlugin = {
   *   namespace: '@myPlugin',
   *   handlers: {
   *     * foo(operation, context) {
   *       // handle operations of kind @myPlugin/foo
   *     },
   *     * '@anotherPlugin/bar'(operation, context) {
   *       // handle operations of kind @anotherPlugin/bar
   *     },
   *   },
   * }
   * ```
   */
  handlers: {
    [Kind in keyof KindTypeMap]: <T extends KindTypeMap[Kind]>(operation: T, context: Context) => Generator
  }

  /**
   * A map of operation kinds to validator functions.
   */
  validators?: {
    [Kind in keyof KindTypeMap]?: <T extends KindTypeMap[Kind]>(operation: T) => void
  }
}

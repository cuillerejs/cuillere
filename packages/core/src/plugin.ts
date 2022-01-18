import type { Generator } from './generator'
import type { Operation } from './operation'

/**
 * Interface for a Cuillere plugin.
 *
 * Plugins are responsible for handling operations.
 *
 * @typeParam Context Type of the context for this plugin.
 */
export interface Plugin<Context = any> {

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
  handlers: Record<string, HandlerFunction<Context>>

  /**
   * A map of operation kinds to validator functions.
   */
  validators?: Record<string, ValidatorFunction>
}

/**
 * A generator function responsible for handling a particular kind of operation.
 *
 * @param operation Operation to be handled.
 * @param context Context object.
 * @typeParam Context object type.
 */
export type HandlerFunction<Context = any> = (operation: Operation, context: Context) => Generator

/**
 * A function responsible for validating a particular kind of operation.
 *
 * Must throw an error if the operation is invalid.
 *
 * @param operation The operation object to be validated.
 */
export type ValidatorFunction = (operation: Operation) => void

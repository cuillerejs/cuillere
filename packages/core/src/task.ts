/**
 * An asynchronous task.
 *
 * A task is created when using the [[fork]] effect.
 *
 * @typeParam R Return type of the task.
 */
export interface Task<R = any> {

  /**
   * A promise to be resolved with the result of the task.
   */
  result: Promise<R>

  /**
   * Cancels the task.
   *
   * @returns A promise to be resolved when the task has been cancelled.
   */
  cancel(): Promise<void>
}

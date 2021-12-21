export interface Task<R = any> {
  result: Promise<R>
  cancel(): Promise<void>
}

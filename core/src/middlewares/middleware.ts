export interface Middleware {
  (operation: any, ctx: any): Generator<any> | AsyncGenerator<any>
}

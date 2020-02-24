export interface Middleware {
  (operation: any, ctx: any): Generator | AsyncGenerator
}

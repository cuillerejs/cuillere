export interface Middleware {
  (operation: any, ctx: any, next: (operation: any) => any): Generator | AsyncGenerator
}

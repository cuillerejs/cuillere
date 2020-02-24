export interface Middleware {
  (
    operation: any,
    ctx: any,
    next: (operation: any, terminal?: boolean) => any,
  ): Generator | AsyncGenerator
}

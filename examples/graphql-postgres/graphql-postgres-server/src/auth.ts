import { Plugin } from "graphql-yoga";

export const useAuth = (): Plugin<{ userId: string }> => ({
  onEnveloped({ extendContext, context }) {
    extendContext({ userId: context.request.headers.get('authorization') })
  }
})

export function getUserId(ctx?: { userId?: string }) {
  console.log('getUserId', ctx?.userId, ctx)
  return ctx?.userId
}
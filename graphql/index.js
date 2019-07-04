import { call } from '@cuillere/core'

export const makeResolverFactory = run => genFn => (obj, args, ctx, info) => run(ctx)(call(genFn, obj, args, ctx, info))

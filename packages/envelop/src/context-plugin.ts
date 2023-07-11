import { Operation, Plugin } from '@cuillere/core'
import { GraphQLError } from 'graphql'

const namespace = '@envelop/context'

export interface GetContextOperation extends Operation {
  field?: string
}

export function* getContext<T = any>(field?: string): Generator<GetContextOperation, T> {
  return (yield { kind: `${namespace}/get`, field }) as T
}

type ContextOperations = {
  get: GetContextOperation
}

export const contextPlugin: Plugin<ContextOperations> = {
  namespace,

  handlers: {
    get({ field }, { graphQLContext }) {
      if (!graphQLContext) throw new GraphQLError('getContext() must not be used outside of resolvers')
      if (!field) return graphQLContext
      return graphQLContext[field]
    },
  },
}

import { makeRunner } from '@cuillere/core'
import { makeResolverFactory } from '@cuillere/graphql'
import { queryMiddleware, query } from '@cuillere/postgres'

const makeResolver = makeResolverFactory(makeRunner(queryMiddleware()))

export const resolvers = {
  Query: {
    hello: makeResolver(function*(_, { name }) {
      let res = yield query({ text: 'SELECT NOW()', pool: 'foo' })
      res = yield query({ text: 'SELECT NOW()', pool: 'bar' })
      res = yield query({ text: 'SELECT NOW()', pool: 'bar' })
      const {
        rows: [{ now }],
      } = res
      return `Hello ${name} (${now})`
    }),
  },
}

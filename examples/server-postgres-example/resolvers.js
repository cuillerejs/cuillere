import { GraphQLDate, GraphQLDateTime } from 'graphql-scalars'
import { query, sleep } from '@cuillere/server-postgres'

const simpleResolvers = {
  Query: {
    * hello(_, { name }) {
      const { rows: [{ now }] } = yield query({ text: 'SELECT NOW()', pool: 'identity' })
      return `Hello ${name} (${now})`
    },
    * wait(_, { time = 1000 }) {
      yield sleep(time)
      return `waited ${time}ms`
    },
    * now() {
      const { rows: [{ now }] } = yield query({ text: 'SELECT NOW()', pool: 'geo' })
      return now
    },
  },
}

export const resolvers = [
  { Date: GraphQLDate, DateTime: GraphQLDateTime },
  simpleResolvers,
]

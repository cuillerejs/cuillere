import { GraphQLDate, GraphQLDateTime } from 'graphql-scalars'
import { query } from '@cuillere/server-postgres'

const simpleResolvers = {
  Query: {
    * hello(_, { name }) {
      const { rows: [{ now }] } = yield query({ text: 'SELECT NOW()', pool: 'people' })
      return `Hello ${name} (${now})`
    },
    wait: async () => new Promise(resolve => setTimeout(resolve, 5000)),
    * now() {
      const { rows: [{ now }] } = yield query({ text: 'SELECT NOW()', pool: 'geo' })
      return now
    },
    * person(_, { id }, { crud }) {
      return yield crud.people.people.get(id)
    },
  },
}

export const resolvers = [
  { Date: GraphQLDate, DateTime: GraphQLDateTime },
  simpleResolvers,
]

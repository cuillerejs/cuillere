import { GraphQLDate, GraphQLDateTime } from 'graphql-iso-date'
import { query as postgresQuery } from '@cuillere/postgres'
import { query as mariadbQuery } from '@cuillere/mariadb'

const simpleResolvers = {
  Query: {
    * hello(_, { name }) {
      const { rows: [{ now }] } = yield postgresQuery({ text: 'SELECT NOW()', pool: 'people' })
      return `Hello ${name} (${now})`
    },
    wait: async () => new Promise(resolve => setTimeout(resolve, 5000)),
  },
}

const namesResolvers = {
  Query: {
    * uuid() {
      const [{ uuid }] = yield mariadbQuery({ sql: 'SELECT UUID() AS uuid' })
      return uuid
    },
    * now() {
      const [{ now }] = yield mariadbQuery({ sql: 'SELECT NOW() AS now' })
      return now
    },
  },
}

export const resolvers = [
  { Date: GraphQLDate, DateTime: GraphQLDateTime },
  simpleResolvers,
  namesResolvers,
]

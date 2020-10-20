import { GraphQLDate, GraphQLDateTime } from 'graphql-iso-date'
import cuillere from '@cuillere/core'
import { makeResolversFactory } from '@cuillere/server'
import { clientPlugin as postgresClientPlugin, query as postgresQuery } from '@cuillere/postgres'
import { clientPlugin as mariadbClientPlugin, query as mariadbQuery } from '@cuillere/mariadb'

const makeResolvers = makeResolversFactory(cuillere(
  postgresClientPlugin(),
  mariadbClientPlugin(),
))

const simpleResolvers = {
  Query: {
    * hello(_, { name }) {
      const { rows: [{ now }] } = yield postgresQuery({ text: 'SELECT NOW()' })
      return `Hello ${name} (${now})`
    },
  },

  Mutation: {
    wait: async () => new Promise(resolve => setTimeout(resolve, 5000)),
  },
}

const databaseResolvers = {
  Mutation: {
    * setupDatabase() {
      yield postgresQuery({ text: 'CREATE TABLE IF NOT EXISTS names (name varchar(250))' })
    },
  },
}

const namesResolvers = {
  Query: {
    * all() {
      const res = yield postgresQuery({ text: 'SELECT name from names' })
      return res.rows.map(({ name }) => name)
    },
    * uuid() {
      const [{ uuid }] = yield mariadbQuery({ sql: 'SELECT UUID() AS uuid' })
      return uuid
    },
    * now() {
      const [{ now }] = yield mariadbQuery({ sql: 'SELECT NOW() AS now' })
      return now
    },
  },

  Mutation: {
    * addName(_, { name }) {
      yield postgresQuery({ text: 'INSERT INTO names VALUES ($1)', values: [name] })
      return name
    },
    * setName(_, { before, after }) {
      const { rows: [updated] } = yield postgresQuery({
        text: 'UPDATE names SET name = $2 WHERE name = $1 RETURNING name',
        values: [before, after],
      })
      return updated && updated.name
    },
  },
}

export const resolvers = makeResolvers([
  { Date: GraphQLDate, DateTime: GraphQLDateTime },
  databaseResolvers,
  simpleResolvers,
  namesResolvers,
])

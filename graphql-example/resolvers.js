import { GraphQLDate, GraphQLDateTime } from 'graphql-iso-date'
import cuillere from '@cuillere/core'
import { makeResolversFactory } from '@cuillere/server'
import { clientPlugin, query } from '@cuillere/postgres'

const makeResolvers = makeResolversFactory(cuillere(clientPlugin()))

const simpleResolvers = {
  Query: {
    * hello(_, { name }) {
      const { rows: [{ now }] } = yield query({ text: 'SELECT NOW()' })
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
      yield query({ text: 'CREATE TABLE IF NOT EXISTS names (name varchar(250))' })
    },
  },
}

const namesResolvers = {
  Query: {
    * all() {
      const res = yield query({ text: 'SELECT name from names' })
      return res.rows.map(({ name }) => name)
    },
  },

  Mutation: {
    * addName(_, { name }) {
      yield query({ text: 'INSERT INTO names VALUES ($1)', values: [name] })
      return name
    },
    * setName(_, { before, after }) {
      const { rows: [updated] } = yield query({
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

import cuillere from '@cuillere/core'
import { makeResolversTreeFactory } from '@cuillere/graphql'
import { clientPlugin, query } from '@cuillere/postgres'

const makeResolversTree = makeResolversTreeFactory(cuillere(clientPlugin()))

export const resolvers = makeResolversTree({
  Query: {
    * hello(_, { name }) {
      const { rows: [{ now }] } = yield query({ text: 'SELECT NOW()' })
      return `Hello ${name} (${now})`
    },
    * all() {
      const res = yield query({ text: 'SELECT name from names' })
      return res.rows.map(({ name }) => name)
    },
  },

  Mutation: {
    * setupDatabase() {
      yield query({ text: 'CREATE TABLE IF NOT EXISTS names (name varchar(250))' })
    },
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
    wait: async () => {
      await new Promise(resolve => setTimeout(resolve, 5000))
    },
  },
})

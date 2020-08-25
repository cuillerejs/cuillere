import cuillere from '@cuillere/core'
import { makeResolversTreeFactory } from '@cuillere/graphql'
import { queryPlugin, query } from '@cuillere/postgres'

const cllr = cuillere(queryPlugin())

const makeResolversTree = makeResolversTreeFactory(cllr)

export const resolvers = makeResolversTree({
  Query: {
    * hello(_, { name }) {
      let res = yield query({ text: 'SELECT NOW()', pool: 'foo' })
      res = yield query({ text: 'SELECT NOW()', pool: 'bar' })
      res = yield query({ text: 'SELECT NOW()', pool: 'bar' })
      const {
        rows: [{ now }],
      } = res
      return `Hello ${name} (${now})`
    },
    * all() {
      const res = yield query({ text: 'SELECT name from names', pool: 'foo' })
      return res.rows.map(({ name }) => name)
    },
  },

  Mutation: {
    * setupDatabase() {
      yield query({ pool: 'foo', text: 'CREATE TABLE names (name varchar(250))' })
    },
    * addName(_, { name }) {
      yield query({ pool: 'foo', text: 'INSERT INTO names VALUES ($1)', values: [name] })
      return name
    },
    * setName(_, { before, after }) {
      const { rows: [updated] } = yield query({
        pool: 'foo',
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

import Koa from 'koa'
import { ApolloServer, gql } from 'apollo-server-koa'
import { makeRunner } from '@cuillere/core'
import { makeResolverFactory } from '@cuillere/graphql'
import { queryMiddleware, query, makePool } from '@cuillere/postgres'

const typeDefs = gql`
  type Query {
    hello(name: String): String!
  }
`
const makeResolver = makeResolverFactory(makeRunner(
  queryMiddleware(),
))

const resolvers = {
  Query: {
    hello: makeResolver(function* (_, { name }) {
      const res = yield query('SELECT NOW()')
      const { rows:[{ now }] } = res
      return `Hello ${name} (${now})`
    }),
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ ctx }) => ctx,
})

const app = new Koa()

const pool = makePool({
  database: 'postgres',
  user: 'postgres',
  password:'password',
  port: 32768,
})

app.use(pool.execute)

server.applyMiddleware({ app })

app.listen({ port: 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`),
)
import Koa from 'koa'
import { ApolloServer, gql } from 'apollo-server-koa'
import { makeRequestHandlerFactory } from '@cuillere/koa'
import { poolMiddleware, queryMiddleware, query, makePool } from '@cuillere/postgres'
import { call, makeRunner } from '@cuillere/core'

const typeDefs = gql`
  type Query {
    hello(name: String): String!
  }
`
const run = makeRunner(
  queryMiddleware(),
)

const resolvers = {
  Query: {
    hello: (_, { name }, context) => run(context)(call(function* () {
      const res = yield query('SELECT NOW()')
      const { rows:[{ now }] } = res
      return `Hello ${name} (${now})`
    })),
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

app.use(async (ctx, next) => pool.execute(ctx, next))

server.applyMiddleware({ app })

app.listen({ port: 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`),
)
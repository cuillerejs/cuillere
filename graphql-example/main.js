import Koa from 'koa'
import { ApolloServer } from 'apollo-server-koa'
import { createClientProvider, createTransactionManager } from '@cuillere/postgres'

import { typeDefs } from './schema'
import { resolvers } from './resolvers'

const app = new Koa()

const basePoolConfig = {
  database: 'postgres',
  user: 'postgres',
  password: 'password',
}

app.use(createClientProvider(
  { ...basePoolConfig, name: 'foo', port: 54321 },
  { ...basePoolConfig, name: 'bar', port: 54322 },
))

app.use(createTransactionManager())

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ ctx }) => ctx,
})

server.applyMiddleware({ app })

app.listen({ port: 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`))

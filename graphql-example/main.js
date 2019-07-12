import Koa from 'koa'
import { ApolloServer, gql } from 'apollo-server-koa'
import { createClientPovider, createTransactionExecutor } from '@cuillere/postgres'

import { typeDefs } from './schema'
import { resolvers } from './resolvers'

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ ctx }) => ctx,
})

const basePoolConfig = {
  database: 'postgres',
  user: 'postgres',
  password: 'password',
}

const clientProvider = createClientPovider(
  { ...basePoolConfig, name: 'foo', port: 32773 },
  { ...basePoolConfig, name: 'bar', port: 32772 },
)

const transactionExecutor = createTransactionExecutor()

const app = new Koa()
app.use(clientProvider)
app.use(transactionExecutor)

server.applyMiddleware({ app })

app.listen({ port: 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`),
)

import Koa from 'koa'
import { ApolloServer } from 'apollo-server-koa'
import { CuillerePostgresApolloPlugin } from '@cuillere/postgres-apollo-plugin'
import { typeDefs } from './schema'
import { resolvers } from './resolvers'

const app = new Koa()

const basePoolConfig = {
  database: 'postgres',
  user: 'postgres',
  password: 'password',
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ ctx }) => ctx,
  plugins: [
    CuillerePostgresApolloPlugin({ poolConfigs: [
      { ...basePoolConfig, name: 'foo', port: 54321 },
      { ...basePoolConfig, name: 'bar', port: 54322 },
    ] }),
  ],
})

server.applyMiddleware({ app })

app.listen({ port: 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`))

import Koa from 'koa'
import { ApolloServer } from 'apollo-server-koa'
import { CuillerePostgresApolloPlugin } from '@cuillere/postgres-apollo-plugin'
import { typeDefs } from './schema'
import { resolvers } from './resolvers'

const app = new Koa()

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ ctx }) => ctx,
  plugins: [
    CuillerePostgresApolloPlugin({ poolConfig: {
      database: 'postgres',
      user: 'postgres',
      password: 'password',
      port: 54321,
    } }),
  ],
})

app.use((ctx, next) => {
  ctx.state.cllrCtx = {}
  return next()
})

server.applyMiddleware({ app })

app.listen({ port: 4000 }, () => console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`))

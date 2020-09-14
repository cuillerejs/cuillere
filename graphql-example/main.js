import Koa from 'koa'
import { ApolloServer } from 'apollo-server-koa'
import { PostgresApolloPlugin } from '@cuillere/postgres-apollo-plugin'
import { PoolProvider } from '@cuillere/postgres'
import { PostgresKoaMiddleware } from '@cuillere/postgres-koa-middleware'
import { typeDefs } from './schema'
import { resolvers } from './resolvers'

const poolProvider = new PoolProvider({
  database: 'postgres',
  user: 'postgres',
  password: 'password',
  port: 54321,
})

const app = new Koa()

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ ctx }) => ctx,
  plugins: [PostgresApolloPlugin({ poolProvider })],
})

app.use(PostgresKoaMiddleware({ poolProvider, transactionManager: 'none' }))

server.applyMiddleware({ app })

app.listen({ port: 4000 }, () => console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`))

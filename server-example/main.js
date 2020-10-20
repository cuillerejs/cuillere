import Koa from 'koa'
import { ApolloServer } from 'apollo-server-koa'
import { ApolloServerPlugin, KoaMiddleware, AsyncTaskManager } from '@cuillere/server'
import { PoolManager as PostgresPoolManager, getClientManager } from '@cuillere/postgres'
import { PoolManager as MariadbPoolManager, getConnectionManager } from '@cuillere/mariadb'
import { typeDefs } from './schema'
import { resolvers } from './resolvers'

const postgresPoolManager = new PostgresPoolManager({
  database: 'postgres',
  user: 'postgres',
  password: 'password',
  port: 54321,
})

const mariadbPoolManager = new MariadbPoolManager({
  database: 'mysql',
  user: 'root',
  password: 'password',
  port: 33061,
})

const app = new Koa()

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ ctx }) => ctx,
  plugins: [
    new ApolloServerPlugin({
      context(reqCtx) {
        return reqCtx.context.cuillere = {} // eslint-disable-line no-return-assign
      },
      taskManager(reqCtx) {
        const isMutation = reqCtx.operation.operation === 'mutation'

        if ('cuillere' in reqCtx.context && !isMutation) return null

        return new AsyncTaskManager(
          getClientManager({
            poolManager: postgresPoolManager,
            transactionManager: isMutation ? 'default' : 'read-only',
          }),
          getConnectionManager({
            poolManager: mariadbPoolManager,
            transactionManager: isMutation ? 'default' : 'read-only',
          }),
        )
      },
    }),
  ],
})

app.use(KoaMiddleware({
  context(ctx) {
    return ctx.cuillere = {} // eslint-disable-line no-return-assign
  },
  taskManager() {
    return new AsyncTaskManager(
      getClientManager({
        poolManager: postgresPoolManager,
        transactionManager: 'read-only',
      }),
      getConnectionManager({
        poolManager: mariadbPoolManager,
        transactionManager: 'read-only',
      }),
    )
  },
}))

server.applyMiddleware({ app })

app.listen({ port: 4000 }, () => console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`))

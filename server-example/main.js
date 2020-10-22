import Koa from 'koa'
import { ApolloServer } from 'apollo-server-koa'
import cuillere from '@cuillere/core'
import { ApolloServerPlugin, KoaMiddleware, AsyncTaskManager, wrapFieldResolvers, taskManagerPlugin } from '@cuillere/server'
import {
  PoolManager as PostgresPoolManager, getClientManager, clientPlugin as postgresClientPlugin, query as postgresQuery, DEFAULT_POOL,
} from '@cuillere/postgres'
import { PoolManager as MariadbPoolManager, getConnectionManager, clientPlugin as mariadbClientPlugin, query as mariadbQuery } from '@cuillere/mariadb'

import { typeDefs } from './schema'
import { resolvers } from './resolvers'

const postgresPoolConfig = [
  {
    name: 'people',
    host: 'localhost',
    port: 54321,
    database: 'people',
    user: 'people',
    password: 'password',
  },
  {
    name: 'geo',
    host: 'localhost',
    port: 54321,
    database: 'geo',
    user: 'geo',
    password: 'password',
  },
]

const postgresPoolManager = new PostgresPoolManager(postgresPoolConfig)

const mariadbPoolConfig = {
  host: 'localhost',
  port: 33061,
  database: 'contacts',
  user: 'contacts',
  password: 'password',
}

const mariadbPoolManager = new MariadbPoolManager(mariadbPoolConfig)

const server = new ApolloServer({
  typeDefs,
  resolvers: wrapFieldResolvers(resolvers, cuillere(
    postgresClientPlugin(),
    mariadbClientPlugin(),
  )),
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
            transactionManager: isMutation ? 'two-phase' : 'read-only',
          }),
          getConnectionManager({
            poolManager: mariadbPoolManager,
            transactionManager: isMutation ? 'two-phase' : 'read-only',
          }),
        )
      },
    }),
  ],
})

const app = new Koa()

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

async function init() {
  await cuillere(
    taskManagerPlugin(
      getClientManager({
        poolConfig: [
          {
            name: DEFAULT_POOL,
            host: 'localhost',
            port: 54321,
            database: 'postgres',
            user: 'postgres',
            password: 'password',
          },
          ...postgresPoolConfig,
        ],
        transactionManager: 'none',
      }),
      getConnectionManager({
        poolConfig: [
          {
            name: DEFAULT_POOL,
            host: 'localhost',
            port: 33061,
            database: 'mysql',
            user: 'root',
            password: 'password',
          },
          {
            name: 'contacts',
            ...mariadbPoolConfig,
          },
        ],
        transactionManager: 'none',
      }),
    ),
    postgresClientPlugin(),
    mariadbClientPlugin(),
  ).call(ensureDatabases)

  app.listen({ port: 4000 }, () => console.log(`🥄 Server ready at http://localhost:4000${server.graphqlPath}`))
}

init()

function* ensureDatabases() {
  yield* ensurePostgresDatabase('people')

  // FIXME champ adresse
  yield postgresQuery({
    text: `
      CREATE TABLE IF NOT EXISTS people (
        id SERIAL NOT NULL PRIMARY KEY,
        firstname TEXT NOT NULL,
        lastname TEXT NOT NULL
      )
    `,
    pool: 'people',
  })

  //  FIXME relation NN téléphone

  yield* ensurePostgresDatabase('geo')

  yield postgresQuery({
    text: `
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL NOT NULL PRIMARY KEY,
        number TEXT NOT NULL,
        street TEXT NOT NULL,
        postalcode TEXT NOT NULL,
        city TEXT NOT NULL
      )
    `,
    pool: 'geo',
  })

  yield* ensureMariadbDatabase('contacts')

  yield mariadbQuery({
    sql: `
      CREATE TABLE IF NOT EXISTS phones (
        id MEDIUMINT AUTO_INCREMENT NOT NULL PRIMARY KEY,
        number TEXT NOT NULL
      )
    `,
    pool: 'contacts',
  })
}

function* ensurePostgresDatabase(name) {
  const { rowCount } = yield postgresQuery({ text: 'SELECT 1 FROM pg_catalog.pg_database WHERE datname = $1', values: [name] })
  if (rowCount === 0) {
    yield postgresQuery({ text: `CREATE DATABASE ${name}` })
    yield postgresQuery({ text: `CREATE USER ${name} WITH ENCRYPTED PASSWORD 'password'` })
    yield postgresQuery({ text: `GRANT ALL PRIVILEGES ON DATABASE ${name} TO ${name}` })
  }
}

function* ensureMariadbDatabase(name) {
  yield mariadbQuery({ sql: `CREATE DATABASE IF NOT EXISTS ${name}` })
  yield mariadbQuery({ sql: `CREATE USER IF NOT EXISTS ${name} IDENTIFIED BY 'password'` })
  yield mariadbQuery({ sql: `GRANT ALL PRIVILEGES ON ${name}.* TO ${name}` })
}

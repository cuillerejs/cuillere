import cuillere from '@cuillere/core'
import { AsyncTaskManager, taskManagerPlugin, CuillereServer } from '@cuillere/server'
import { PoolManager as PostgresPoolManager, getClientManager, clientPlugin as postgresClientPlugin, DEFAULT_POOL } from '@cuillere/postgres'
import { PoolManager as MariadbPoolManager, getConnectionManager, clientPlugin as mariadbClientPlugin } from '@cuillere/mariadb'

import { ensureDatabases } from './databases'
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

const initDatabase = () => cuillere(
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

const server = new CuillereServer(
  {
    typeDefs,
    resolvers,
  },
  {
    requestTaskManager() {
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
    graphqlRequestTaskManager(reqCtx) {
      if (reqCtx.operation.operation !== 'mutation') return null

      return new AsyncTaskManager(
        getClientManager({
          poolManager: postgresPoolManager,
          transactionManager: 'two-phase',
        }),
        getConnectionManager({
          poolManager: mariadbPoolManager,
          transactionManager: 'two-phase',
        }),
      )
    },
    plugins: [
      postgresClientPlugin(),
      mariadbClientPlugin(),
    ],
  },
)

async function start() {
  try {
    await initDatabase()

    server.listen({ port: 4000 }, () => console.log(`🥄 Server ready at http://localhost:4000${server.graphqlPath}`))
  } catch (err) {
    console.error('💀 starting server failed')
    console.error(err)
    process.exit(1)
  }
}

start()

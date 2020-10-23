import { AsyncTaskManager, CuillereServer } from '@cuillere/server'
import { getClientManager, clientPlugin } from '@cuillere/postgres'
import { getConnectionManager, connectionPlugin } from '@cuillere/mariadb'

import { typeDefs } from './schema'
import { resolvers } from './resolvers'
import { initPostgres, poolManager as postgresPoolManager } from './postgres'
import { initMariadb, poolManager as mariadbPoolManager } from './mariadb'

const server = new CuillereServer(
  {
    typeDefs,
    resolvers,
  },
  {
    httpRequestTaskManager() {
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
      clientPlugin(),
      connectionPlugin(),
    ],
  },
)

async function start() {
  try {
    await initPostgres()
    await initMariadb()

    server.listen({ port: 4000 }, () => console.log(`🥄 Server ready at http://localhost:4000${server.graphqlPath}`))
  } catch (err) {
    console.error('💀 Starting server failed')
    console.error(err)
    process.exit(1)
  }
}

start()

import { CuillereServer } from '@cuillere/server'
import { postgresServerPlugin } from '@cuillere/postgres'
import { getConnectionManager, connectionPlugin } from '@cuillere/mariadb'

import { typeDefs } from './schema'
import { resolvers } from './resolvers'
import { ensurePostgresSchema, poolConfig as postgresPoolConfig } from './postgres'
import { ensureMariadbSchema, poolManager as mariadbPoolManager } from './mariadb'

const server = new CuillereServer(
  {
    typeDefs,
    resolvers,
  },
  {
    plugins: [
      postgresServerPlugin({
        poolConfig: postgresPoolConfig,
      }),
      // FIXME use mariadbServerPlugin
      () => ({
        httpRequestListeners() {
          return getConnectionManager({
            poolManager: mariadbPoolManager,
            transactionManager: 'read-only',
          })
        },
        graphqlRequestListeners(reqCtx) {
          if (reqCtx.operation.operation !== 'mutation') return
          return getConnectionManager({
            poolManager: mariadbPoolManager,
            transactionManager: 'two-phase',
          })
        },
        plugins: connectionPlugin(),
      }),
    ],
  },
)

async function start() {
  try {
    await ensurePostgresSchema()
    await ensureMariadbSchema()

    server.listen({ port: 4000 }, () => console.log(`🥄 Server ready at http://localhost:4000${server.graphqlPath}`))
  } catch (err) {
    console.error('💀 Starting server failed')
    console.error(err)
    process.exit(1)
  }
}

start()

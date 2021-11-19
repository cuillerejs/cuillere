import {cuillere} from "@cuillere/core";
import {PoolManager, getClientManager, postgresPlugin, query} from "@cuillere/postgres";
import {taskManagerPlugin} from "@cuillere/server-plugin";

export const postgresPoolConfig = {
  host: 'localhost',
  port: 54321,
  database: 'postgres',
  user: 'postgres',
  password: 'password',
}

function* ensureSchema() {
  yield query(`
    CREATE TABLE IF NOT EXISTS test (
        data TEXT
    )
  `)
}

export const ensurePostgresSchema = async () => {
  const poolManager = new PoolManager(postgresPoolConfig)
  await cuillere(
    taskManagerPlugin(getClientManager({ poolManager, transactionManager: 'none' })),
    postgresPlugin(),
  ).call(ensureSchema).finally(() => poolManager.end())
}

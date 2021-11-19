import {cuillere} from "@cuillere/core";
import {taskManagerPlugin} from "@cuillere/server-plugin";
import {getConnectionManager, query, connectionPlugin, PoolManager} from "@cuillere/mariadb";

export const mariaPoolConfig = {
  host: 'localhost',
  port: 33061,
  database: 'mysql',
  user: 'root',
  password: 'password',
}

function* ensureSchema() {
  yield query(`
    CREATE TABLE IF NOT EXISTS phones (
      id MEDIUMINT AUTO_INCREMENT NOT NULL PRIMARY KEY,
      number TEXT NOT NULL
    )
  `)
}

export const ensureMariadbSchema = async () => {
  const poolManager = new PoolManager(mariaPoolConfig)
  await cuillere(
    taskManagerPlugin(getConnectionManager({ poolManager, transactionManager: 'none' }),),
    connectionPlugin(),
  ).call(ensureSchema).finally(() => poolManager.end())
}

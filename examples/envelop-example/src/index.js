import { app } from "./http-server.js"
import {ensureMariadbSchema} from "./mariadb.js";
import {ensurePostgresSchema} from "./postgres.js";

async function main() {
  await ensureMariadbSchema()
  await ensurePostgresSchema()
  console.info(`🚀 served on ${await app.listen(3000)}/graphql`)
}

main().catch(console.error)

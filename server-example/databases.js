import { query as postgresQuery } from '@cuillere/postgres'
import { query as mariadbQuery } from '@cuillere/mariadb'

export function* ensureDatabases() {
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

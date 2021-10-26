import postgres from '@cuillere/postgres-envelop'
import {envelop, useErrorHandler, useLogger, useSchema} from "@envelop/core";
import mariadb from "@cuillere/mariadb-envelop";
import {schema} from "./schema.js";
import {mariaPoolConfig} from "./mariadb.js";
import {postgresPoolConfig} from "./postgres.js";

export const getEnveloped = envelop({
  plugins: [
    useSchema(schema),
    useErrorHandler((errors) => {
      console.error('GraphQL Errors:', errors.map(error => error.originalError || error))
    }),
    postgres.usePostgres({
      poolConfig: postgresPoolConfig
    }),
    mariadb.useMaria({
      poolConfig: mariaPoolConfig
    })
  ],
})

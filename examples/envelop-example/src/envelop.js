import postgres from '@cuillere/postgres-envelop'
import {envelop, useSchema} from "@envelop/core";
import {schema} from "./schema.js";

export const getEnveloped = envelop({
  plugins: [useSchema(schema), postgres.usePostgres({
    poolConfig: {
      host: 'localhost',
      port: 54321,
      database: 'postgres',
      user: 'postgres',
      password: 'password',
    }
  })],
})

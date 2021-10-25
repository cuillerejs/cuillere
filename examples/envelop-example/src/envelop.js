import cuillereEnvelop from '@cuillere/envelop'
import {envelop, useSchema} from "@envelop/core";
import {schema} from "./schema.js";

const { usePostgres } = cuillereEnvelop

export const getEnveloped = envelop({
  plugins: [useSchema(schema), usePostgres({
    poolConfig: {
      host: 'localhost',
      port: 54321,
      database: 'postgres',
      user: 'postgres',
      password: 'password',
    }
  })],
})

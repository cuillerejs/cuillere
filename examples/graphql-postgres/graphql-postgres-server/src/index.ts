import { createYoga } from 'graphql-yoga'
import { useCuillere } from '@cuillere/envelop'
import { schema } from './schema.js'
import { usePostgres } from '@cuillere/postgres/yoga'
import { createServer } from 'node:http'
import { useAuth } from './auth.js'

const yoga = createYoga({
  schema,
  plugins: [
    useAuth(),
    useCuillere(),
    usePostgres({
      pool: {
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'postgres',
      }
    })
  ],
  batching: true,
})

const server = createServer(yoga)
server.listen(4000, () => console.log('Server is running on http://localhost:4000/graphql'))
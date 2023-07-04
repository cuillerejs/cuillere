import { createServer } from 'node:http'
import { createSchema, createYoga } from 'graphql-yoga'
import { useCuillere } from '@cuillere/envelop'

const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        ping: String
      }
    `,
    resolvers: {
      Query: {
        * ping() {
          return 'pong'
        },
      },
    },
  }),

  plugins: [
    useCuillere(),
  ],
})

const server = createServer(yoga)

server.listen(4000, () => {
  console.log('Listening at http://localhost:4000/')
})

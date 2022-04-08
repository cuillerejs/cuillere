import { createServer } from 'graphql-yoga'
import { useCuillere } from '@cuillere/envelop'

const server = createServer({
  schema: {
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
  },

  plugins: [
    useCuillere(),
  ],
})

server.start().then(() => {
  console.log('Listening at http://localhost:4000/')
})

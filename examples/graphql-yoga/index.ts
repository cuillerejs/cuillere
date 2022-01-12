import { createServer } from 'graphql-yoga'
import { useCuillere } from '@cuillere/envelop'

const server = createServer({
  typeDefs: `
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
  plugins: [
    useCuillere(),
  ],
})

server.start(() => {
  console.log('Listening at http://localhost:4000/')
})

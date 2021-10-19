import { envelop, useSchema } from '@envelop/core'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { fastify } from 'fastify'
import { getGraphQLParameters, processRequest, renderGraphiQL, shouldRenderGraphiQL } from 'graphql-helix'

import { useCuillere } from './envelop'

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello(name: String): Greeting
      bye(name: String): Greeting
    }

    type Greeting {
      message: String
    }
  `,
  resolvers: {
    Query: {
      * hello(_, { name }) {
        return { prefix: 'Hello ', suffix: '!', name }
      },
      bye(_, { name }) {
        return { prefix: 'Bye ', suffix: '.', name }
      },
    },

    Greeting: {
      * message({ prefix, suffix, name }) {
        return `${prefix}${name}${suffix}`
      },
    },
  },
})

export const getEnveloped = envelop({
  plugins: [useSchema(schema), useCuillere()],
})

const app = fastify()

app.route({
  method: ['GET', 'POST'],
  url: '/graphql',
  async handler(req, res) {
    const { parse, validate, contextFactory, execute, schema } = getEnveloped({ req })
    const request = {
      body: req.body,
      headers: req.headers,
      method: req.method,
      query: req.query,
    }

    if (shouldRenderGraphiQL(request)) {
      res.type('text/html')
      res.send(renderGraphiQL({}))
    } else {
      const { operationName, query, variables } = getGraphQLParameters(request)
      const result = await processRequest({
        operationName,
        query,
        variables,
        request,
        schema,
        parse,
        validate,
        execute,
        contextFactory,
      })

      if (result.type === 'RESPONSE') {
        res.status(result.status)
        res.send(result.payload)
      } else {
        // You can find a complete example with GraphQL Subscriptions and stream/defer here:
        // https://github.com/contrawork/graphql-helix/blob/master/examples/fastify/server.ts
        res.send({ errors: [{ message: 'Not Supported in this demo' }] })
      }
    }
  },
})

app.listen(3000)

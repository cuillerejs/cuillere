import {envelop, useSchema} from "@envelop/core";
import {useCuillere} from "./envelop";
import {usePostgres} from "./databases";
import fetch from "node-fetch";
import {makeExecutableSchema} from "@graphql-tools/schema";
import {fastify} from "fastify";
import {getGraphQLParameters, processRequest, renderGraphiQL, shouldRenderGraphiQL} from "graphql-helix";

describe('databases', () => {
  it('should allow to register a database', () => {
    getEnveloped = envelop({ plugins: [
      usePostgres({
        poolConfig: {
          host: 'localhost',
          port: 54321,
          database: 'people',
          user: 'people',
          password: 'password',
        }
      })
    ]})
  })
})



async function query(query, variables = {}): Promise<any> {
  const response = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
    headers: { accept: 'application/json', 'content-type': 'application/json' },
  })
  
  return response.json()
}

let getEnveloped = envelop({ plugins: [] })

function setSchema(typeDefs, resolvers) {
  getEnveloped = envelop({ plugins: [
      useSchema(makeExecutableSchema({ typeDefs, resolvers })),
      useCuillere(),
    ] })
}

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

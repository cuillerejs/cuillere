import { envelop, useSchema } from '@envelop/core'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { fastify } from 'fastify'
import { getGraphQLParameters, processRequest, renderGraphiQL, shouldRenderGraphiQL } from 'graphql-helix'
import fetch from 'node-fetch'

import { useCuillere } from './envelop'

let api
describe('envelop', () => {
  beforeAll(async () => {
    api = await app.listen(0)
  })

  afterAll(async () => {
    await app.close()
  })

  it('should have a graphql server started', async () => {
    const response = await fetch(`${api}/graphql`, { headers: { accept: 'text/html' } })
    expect(response.status).toBe(200)
  })

  it('should allow to use cuillere in root fields', async () => {
    setSchema(
      /* GraphQL */ `
        type Query { hello: String }
      `, {
        Query: { * hello() {
          return 'Hello !'
        } },
      },
    )

    expect(await query(/* GraphQL */`
      query { hello }
    `)).toEqual({ data: {
      hello: 'Hello !',
    } })
  })

  it('should allow to use cuillere with parameter', async () => {
    setSchema(
      /* GraphQL */ `
        type Query { hello(name: String!): String }
      `, {
        Query: { * hello(_, { name }) {
          return `Hello ${name}!`
        } },
      },
    )

    expect(await query(/* GraphQL */`
      query { hello(name: "Valentin") }
    `)).toEqual({ data: {
      hello: 'Hello Valentin!',
    } })
  })

  it('should allow to use cuillere in types', async () => {
    setSchema(
      /* GraphQL */ `
        type Query { hello: Greeting }
        type Greeting { message: String }
      `, {
        Query: { hello: () => ({}) },
        Greeting: { * message() {
          return 'Hello !'
        } },
      },
    )

    expect(await query(/* GraphQL */`
      query { hello { message } }
    `)).toEqual({ data: {
      hello: { message: 'Hello !' },
    } })
  })
})

async function query(query, variables = {}): Promise<any> {
  const response = await fetch(`${api}/graphql`, {
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

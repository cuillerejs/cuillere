import {envelop, useEnvelop, useSchema, Plugin as EnvelopPlugin} from "@envelop/core";
import {usePostgres, useTransactions} from "./databases";
import fetch from "node-fetch";
import {makeExecutableSchema} from "@graphql-tools/schema";
import {fastify} from "fastify";
import {getGraphQLParameters, processRequest, renderGraphiQL, shouldRenderGraphiQL} from "graphql-helix";
import {TaskListener} from "@cuillere/server-plugin";
import {jest} from '@jest/globals'

let api
describe('databases', () => {
  beforeAll(async () => {
    api = await app.listen(0)
  })
  
  afterAll(async () => {
    await app.close()
  })
  
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
  
  it("should allow to register a task listener and call its methods", async () => {
    const listener: TaskListener = {
      initialize: jest.fn(),
      preComplete: jest.fn(),
      complete: jest.fn(),
      error: jest.fn(),
      finalize: jest.fn(),
    }
    
    testPlugin(useTransactions()).addTaskListener({ query: listener, mutation: listener })
    
    await query(/* GraphQL */`{ hello }`)
    expect(listener.initialize).toHaveBeenCalled()
    expect(listener.preComplete).toHaveBeenCalled()
    expect(listener.complete).toHaveBeenCalled()
    expect(listener.error).not.toHaveBeenCalled()
    expect(listener.finalize).toHaveBeenCalled()
  })
  
  it('should call the error and finalize handlers on error', async () => {
    const listener: TaskListener = {
      complete: jest.fn(),
      error: jest.fn(),
      finalize: jest.fn(),
    }
    
    testPlugin(useTransactions()).addTaskListener({ query: listener, mutation: listener })
    
    await query(/* GraphQL */`{ throwing }`)
    expect(listener.complete).not.toHaveBeenCalled()
    expect(listener.error).toHaveBeenCalled()
    expect(listener.finalize).toHaveBeenCalled()
  })
  
  it('should allow to populate context in initialize handler', async () => {
    const listener: TaskListener = {
      initialize(ctx) {
        ctx.test = 'test'
      }
    }
    testPlugin(useTransactions()).addTaskListener({ query: listener, mutation: listener })
    
    const data = await query(/* GraphQL */`{ getContext }`)
    expect(data).toEqual({ data: { getContext: "test" } })
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

const baseEnveloped = envelop({ plugins: [useSchema(makeExecutableSchema({
    typeDefs: /* GraphQL */`
      type Query {
        hello: String,
        throwing: String,
        getContext: String
      }
    `,
    resolvers: {
      Query: {
        *hello() {
          return "test"
        },
        *throwing() {
          throw new Error("test")
        },
        *getContext(_, __, ctx) {
          return ctx.cuillereContext.test
        }
      }
    }
  }))]
})

let getEnveloped = baseEnveloped

function testPlugin<T extends EnvelopPlugin>(plugin: T): T {
  const transactionPlugin = useTransactions()
  getEnveloped = envelop({
    plugins: [useEnvelop(baseEnveloped), plugin]
  })
  return plugin
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

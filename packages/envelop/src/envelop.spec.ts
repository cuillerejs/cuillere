import { Operation, Plugin } from '@cuillere/core'
import { envelop, useSchema, Plugin as EnvelopPlugin, useExtendContext, useEnvelop } from '@envelop/core'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { TypeSource, IResolvers } from '@graphql-tools/utils'
import { fastify } from 'fastify'
import { getGraphQLParameters, processRequest, renderGraphiQL, shouldRenderGraphiQL } from 'graphql-helix'
import fetch from 'node-fetch'

import { getContext, useCuillere, useCuillerePlugins } from './envelop'

describe('envelop', () => {
  let apiURL: string

  beforeAll(async () => {
    apiURL = await app.listen(0)
  })

  afterAll(async () => {
    await app.close()
  })

  it('should have a graphql server started', async () => {
    const response = await fetch(`${apiURL}/graphql`, { headers: { accept: 'text/html' } })
    expect(response.status).toBe(200)
  })

  it('should allow to use cuillere in root fields', async () => {
    setup({
      typeDefs: /* GraphQL */`
        type Query { hello: String }
      `,
      resolvers: {
        Query: {
          * hello() {
            return 'Hello!'
          },
        },
      },
    })

    expect(await query(/* GraphQL */`
      query { hello }
    `)).toEqual({ data: {
      hello: 'Hello!',
    } })
  })

  it('should allow to use cuillere with parameter', async () => {
    setup({
      typeDefs: /* GraphQL */`
        type Query { hello(name: String!): String }
      `,
      resolvers: {
        Query: {
          * hello(_, { name }) {
            return `Hello ${name}!`
          },
        },
      },
    })

    expect(await query(/* GraphQL */`
      query { hello(name: "Valentin") }
    `)).toEqual({ data: {
      hello: 'Hello Valentin!',
    } })
  })

  it('should allow to use cuillere in types', async () => {
    setup({
      typeDefs: /* GraphQL */`
        type Query { hello: Greeting }
        type Greeting { message: String }
      `,
      resolvers: {
        Query: {
          hello: () => ({}),
        },
        Greeting: {
          * message() {
            return 'Hello!'
          },
        },
      },
    })

    expect(await query(/* GraphQL */`
      query { hello { message } }
    `)).toEqual({ data: {
      hello: { message: 'Hello!' },
    } })
  })

  describe('getContext() operation', () => {
    it('should allow to get GraphQL context values from nested functions', async () => {
      setup({
        typeDefs: /* GraphQL */`
          type Query { hello: String }
        `,
        resolvers: {
          Query: {
            * hello() {
              return yield getMessage()
            },
          },
        },
        plugins: [
          useExtendContext(() => ({ helloMessage: 'Hello from the context!' })),
        ],
      })

      function* getMessage() {
        return yield getContext('helloMessage')
      }

      await expect(query(/* GraphQL */`
        query { hello }
      `)).resolves.toEqual({ data: {
        hello: 'Hello from the context!',
      } })
    })

    describe('when yielded outside of execution phase', () => {
      it('should throw an error', async () => {
        setup({
          typeDefs: /* GraphQL */`
            type Query { hello: String }
          `,
          resolvers: {
            Query: {
              * hello() {
                return 'Hello!'
              },
            },
          },
          plugins: [{
            async onContextBuilding({ context }) {
              await context.cuillere.call(function* () {
                yield getContext()
              })
            },
          }],
        })

        const result = query(/* GraphQL */`
          query { hello }
        `)

        await expect(result).resolves.toEqual({
          errors: [{ message: 'getContext() must not be used outside of resolvers' }],
        })
      })
    })
  })

  describe('useCuillerePlugins() envelop plugin', () => {
    const getMessagePlugin: Plugin<{ getMessage: Operation }> = {
      namespace: '@test',
      handlers: {
        * getMessage() {
          return 'Hello from a plugin!'
        },
      },
    }

    it('should add cuillere plugins', async () => {
      setup({
        typeDefs: /* GraphQL */`
        type Query { hello: String }
      `,
        resolvers: {
          Query: {
            * hello() {
              return yield { kind: '@test/getMessage' }
            },
          },
        },
        plugins: [
          useCuillerePlugins(getMessagePlugin),
        ],
      })

      await expect(query(/* GraphQL */`
        query { hello }
      `)).resolves.toEqual({ data: {
        hello: 'Hello from a plugin!',
      } })
    })

    it('should add cuillere plugins from onPluginInit hook', async () => {
      setup({
        typeDefs: /* GraphQL */`
        type Query { hello: String }
      `,
        resolvers: {
          Query: {
            * hello() {
              return yield { kind: '@test/getMessage' }
            },
          },
        },
        plugins: [
          {
            onPluginInit({ addPlugin }) {
              addPlugin(useCuillerePlugins(getMessagePlugin))
            },
          },
        ],
      })

      await expect(query(/* GraphQL */`
        query { hello }
      `)).resolves.toEqual({ data: {
        hello: 'Hello from a plugin!',
      } })
    })
  })

  async function query(query, variables = {}): Promise<any> {
    const response = await fetch(`${apiURL}/graphql`, {
      method: 'POST',
      body: JSON.stringify({ query, variables }),
      headers: { accept: 'application/json', 'content-type': 'application/json' },
    })

    return response.json()
  }

  let getEnveloped = envelop({ plugins: [] })

  function setup({ typeDefs, resolvers, plugins = [] }: { typeDefs: TypeSource; resolvers: IResolvers; plugins?: EnvelopPlugin<any>[] }) {
    getEnveloped = envelop({ plugins: [
      useSchema(makeExecutableSchema({ typeDefs, resolvers })),
      useCuillere(),
      ...plugins,
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
})


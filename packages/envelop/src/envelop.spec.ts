import { describe, it, expect } from 'vitest'

import { Operation, Plugin } from '@cuillere/core'
import { useExtendContext } from '@envelop/core'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { createTestkit } from '@envelop/testing'

import { getContext, useCuillere, useCuillerePlugins } from './envelop'

describe('envelop', () => {
  it('should allow to use cuillere in root fields', async () => {
    const testkit = createTestkit([useCuillere()], makeExecutableSchema({
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
    }))

    expect(await testkit.execute(/* GraphQL */`
      query { hello }
    `)).toEqual({
      data: {
        hello: 'Hello!',
      },
    })
  })

  it('should allow to use cuillere with parameter', async () => {
    const testkit = createTestkit([useCuillere()], makeExecutableSchema({
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
    }))

    expect(await testkit.execute(/* GraphQL */`
      query { hello(name: "Valentin") }
    `)).toEqual({
      data: {
        hello: 'Hello Valentin!',
      },
    })
  })

  it('should allow to use cuillere in types', async () => {
    const testkit = createTestkit([useCuillere()], makeExecutableSchema({
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
    }))

    expect(await testkit.execute(/* GraphQL */`
      query { hello { message } }
    `)).toEqual({
      data: {
        hello: { message: 'Hello!' },
      },
    })
  })

  describe('getContext() operation', () => {
    it('should allow to get GraphQL context values from nested functions', async () => {
      const testkit = createTestkit([
        useCuillere(),
        useExtendContext(() => ({ helloMessage: 'Hello from the context!' })),
      ], makeExecutableSchema({
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
      }))

      function* getMessage() {
        return yield getContext('helloMessage')
      }

      await expect(testkit.execute(/* GraphQL */`
        query { hello }
      `)).resolves.toEqual({
        data: {
          hello: 'Hello from the context!',
        },
      })
    })

    describe('when yielded outside of execution phase', () => {
      it('should throw an error', async () => {
        const testkit = createTestkit([
          useCuillere(),
          {
            async onContextBuilding({ context }) {
              await context.cuillere.call(function* () {
                yield getContext()
              })
            },
          },
        ], makeExecutableSchema({
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
        }))

        await expect(testkit.execute(/* GraphQL */`
          query { hello }
        `)).rejects.toEqual(new Error('getContext() must not be used outside of resolvers'))
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
      const testkit = createTestkit([
        useCuillere(),
        useCuillerePlugins(getMessagePlugin),
      ], makeExecutableSchema({
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
      }))

      await expect(testkit.execute(/* GraphQL */`
        query { hello }
      `)).resolves.toEqual({
        data: {
          hello: 'Hello from a plugin!',
        },
      })
    })

    it('should add cuillere plugins from onPluginInit hook', async () => {
      const testkit = createTestkit([
        useCuillere(),
        {
          onPluginInit({ addPlugin }) {
            addPlugin(useCuillerePlugins(getMessagePlugin))
          },
        },
      ], makeExecutableSchema({
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
      }))

      await expect(testkit.execute(/* GraphQL */`
        query { hello }
      `)).resolves.toEqual({
        data: {
          hello: 'Hello from a plugin!',
        },
      })
    })
  })
})

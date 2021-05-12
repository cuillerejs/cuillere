import gql from 'graphql-tag'
import { get } from '@cuillere/core'
import { GraphQLObjectType } from 'graphql'
import { makeExecutableSchema as originalMakeExecutableSchema } from 'graphql-tools'
import { CUILLERE_PLUGINS, makeExecutableSchema } from './schema'
import { CuillereServer } from './server'

describe('Schema', () => {
  describe('makeExecutableSchema', () => {
    it('should wrap generator resolvers', async () => {
      const { field, schema } = makeSchema(function* () {
        yield get('something')
        return 'test'
      })

      schema[CUILLERE_PLUGINS] = []

      expect(await field.resolve({}, {}, {}, { schema } as any)).toBe('test')
    })

    it('should throw if the schema is used without initalisation', async () => {
      const { field } = makeSchema(function* () {
        yield get('something')
        return 'test'
      })

      await expect(field.resolve({}, {}, {}, null)).rejects.toThrow()
    })

    it('should throw if the schema is not a CuillereSchema', () => {
      const schema = originalMakeExecutableSchema({ typeDefs, resolvers: makeResolvers(() => 'test') })

      expect(() => new CuillereServer({ schema }, { plugins: [] })).toThrow()
    })

    it('should not wrap non generator functions in cuillere', async () => {
      const { field } = makeSchema(async () => {
        await Promise.resolve('something')
        return 'test'
      })

      expect(await field.resolve({}, {}, {}, null)).toBe('test')
    })
  })
})

const typeDefs = gql`
  type Test { id: Int }
`

const makeResolvers = resolver => ({ Test: { id: resolver } })

function makeSchema(resolver) {
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers: makeResolvers(resolver),
  })
  const type = schema.getType('Test') as GraphQLObjectType
  const field = type.getFields().id

  return { schema, type, field, resolver }
}

import gql from 'graphql-tag'
import { get } from '@cuillere/core'
import { GraphQLObjectType } from 'graphql'
import { makeExecutableSchema as originalMakeExecutableSchema } from 'graphql-tools'
import { makeExecutableSchema } from './make-executable-schema'
import { CuillereServer } from './server'

describe('graphql wrapers', () => {
  describe('schema wrapper', () => {
    it('should wrap generator resolvers in cuillere', async () => {
      const { field, schema } = makeSchema(function* () {
        yield get('something')
        return 'test'
      })

      schema.setCuillereConfig({ plugins: [] })

      expect(await field.resolve({}, {}, {}, null)).toBe('test')
    })

    it('should throw if the schema is used without initalisation', async () => {
      const { field } = makeSchema(function* () {
        yield get('something')
        return 'test'
      })

      await expect(field.resolve({}, {}, {}, null)).rejects.toThrow()
    })

    it('should throw if the schema is not generated with cuillere helper', () => {
      const schema = originalMakeExecutableSchema({ typeDefs, resolvers: makeResolvers(() => 'test') })

      expect(() => new CuillereServer({ schema }, { plugins: [] })).toThrow()
    })

    it('should not wrap normal async functions in cuillere', async () => {
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

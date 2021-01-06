import { makeExecutableSchema } from 'graphql-tools'
import gql from 'graphql-tag'
import cuillere, { get } from '@cuillere/core'
import { GraphQLObjectType } from 'graphql'
import { wrapSchemaFields } from './graphql'

describe('graphql wrapers', () => {
  describe('schema wrapper', () => {
    it('should wrap generator resolvers in cuillere', async () => {
      const { schema, field } = makeSchema(function* () {
        yield get('something')
        return 'test'
      })

      wrapSchemaFields(schema, cuillere())

      expect(await field.resolve({}, {}, {}, null)).toBe('test')
    })

    it('should not wrap normal async functions in cuillere', async () => {
      const { schema, resolver, field } = makeSchema(async () => {
        await Promise.resolve('something')
        return 'test'
      })

      wrapSchemaFields(schema, cuillere())

      expect(field.resolve).toBe(resolver)
    })
  })
})

function makeSchema(resolver) {
  const schema = makeExecutableSchema({
    typeDefs: gql`
    type Test { id: Int }
  `,
    resolvers: { Test: { id: resolver } },
  })
  const type = schema.getType('Test') as GraphQLObjectType
  const field = type.getFields().id

  return { schema, type, field, resolver }
}

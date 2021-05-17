import { chan, range, select } from '@cuillere/channels'
import { SyntaxError, gql } from 'apollo-server-core'
import { GraphQLField, GraphQLInterfaceType, GraphQLObjectType } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { CUILLERE_INSTANCE, isCuillereSchema } from './schema'

export const CUILLERE_CHANNELS = Symbol('CUILLERE_CHANNELS')
const CUILLERE_CHANNELS_SUBSCRIBERS = Symbol('CUILLERE_CHANNELS_SUBSCRIBERS')

export class ChannelDirective extends SchemaDirectiveVisitor {
  static typeDefs = gql`
    directive @channel(bufferCapacity: Int = 10) on FIELD_DEFINITION
  `

  visitFieldDefinition(field: GraphQLField<any, any>, details: { objectType: GraphQLObjectType | GraphQLInterfaceType}) {
    const { schema } = this

    if (!isCuillereSchema(schema)) return

    if (details.objectType.name !== 'Subscription') {
      throw new SyntaxError(`@channel must be used on Subscription fields only, found on ${details.objectType.name}.${field.name}`)
    }

    // FIXME use an apollo server plugin (a schema might be reused by more than one server):
    // - create the chan references when the server starts
    // - start the infinite loop when server starts
    // - stop the infinite loop when server stops
    if (!(CUILLERE_CHANNELS in schema)) {
      schema[CUILLERE_CHANNELS] = {}
      schema[CUILLERE_CHANNELS_SUBSCRIBERS] = {}

      schema[CUILLERE_INSTANCE].call(function* () {
        while (true) { // eslint-disable-line no-constant-condition
          try {
            yield select()
          } catch (e) {
            // FIXME
          }
        }
      })
    }

    const { bufferCapacity } = this.args

    if (!(field.name in schema[CUILLERE_CHANNELS])) {
      schema[CUILLERE_CHANNELS][field.name] = chan(bufferCapacity)
      schema[CUILLERE_CHANNELS_SUBSCRIBERS][field.name] = new Set()

      // FIXME start a runner...
    }

    field.subscribe = (): AsyncIterator<any> => ({
      async next() {
        return it.next()
      },

      async return() {

      },
    })
    // field.subscribe = () => range(this.schema[CUILLERE_CHANNELS][field.name])
  }
}

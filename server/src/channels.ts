import { chan, range } from '@cuillere/channels'
import { SyntaxError, gql } from 'apollo-server-core'
import { GraphQLField, GraphQLInterfaceType, GraphQLObjectType } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { assertCuillereSchema } from './schema'

export const CUILLERE_CHANNELS = Symbol('CUILLERE_CHANNELS')

export class ChannelDirective extends SchemaDirectiveVisitor {
  static typeDefs = gql`
    directive @channel(bufferCapacity: Int = 10) on FIELD_DEFINITION
  `

  visitFieldDefinition(field: GraphQLField<any, any>, details: { objectType: GraphQLObjectType | GraphQLInterfaceType}) {
    // FIXME uncomment this
    // assertCuillereSchema(this.schema)

    if (details.objectType.name !== 'Subscription') {
      throw new SyntaxError(`@channel must be used on Subscription fields only, found on ${details.objectType.name}.${field.name}`)
    }

    if (!(CUILLERE_CHANNELS in this.schema)) this.schema[CUILLERE_CHANNELS] = {}

    const { bufferCapacity } = this.args

    // FIXME use an apollo server plugin ?
    // actually a schema might be reused by more than one server
    // so it might be a good idea to create the chan references in the serverWillStart of a plugin...
    this.schema[CUILLERE_CHANNELS][field.name] = chan(bufferCapacity)

    field.subscribe = () => range(this.schema[CUILLERE_CHANNELS][field.name])
  }
}

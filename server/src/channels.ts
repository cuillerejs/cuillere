import { Case, chan, range, recv, select, send } from '@cuillere/channels'
import { SyntaxError, gql } from 'apollo-server-core'
import { GraphQLField, GraphQLInterfaceType, GraphQLObjectType } from 'graphql'
import { SchemaDirectiveVisitor } from 'graphql-tools'

import { CUILLERE_INSTANCE } from './schema'

export const CUILLERE_CHANNELS = Symbol('CUILLERE_CHANNELS')
const CUILLERE_CHANNELS_SUBSCRIBERS = Symbol('CUILLERE_CHANNELS_SUBSCRIBERS')

export class ChannelDirective extends SchemaDirectiveVisitor {
  static typeDefs = gql`
    directive @channel(bufferCapacity: Int = 10) on FIELD_DEFINITION
  `

  visitFieldDefinition(field: GraphQLField<any, any>, details: { objectType: GraphQLObjectType | GraphQLInterfaceType}) {
    const { schema } = this

    if (details.objectType.name !== 'Subscription') {
      throw new SyntaxError(`@channel must be used on Subscription fields only, found on ${details.objectType.name}.${field.name}`)
    }

    if (!(CUILLERE_CHANNELS in schema)) {
      // FIXME use defineProperty
      schema[CUILLERE_CHANNELS] = {}
      schema[CUILLERE_CHANNELS_SUBSCRIBERS] = {}

      // FIXME use an apollo server plugin (a schema might be reused by more than one server):
      // - create the chan references when the server starts
      // - start the infinite loop when server starts
      // - stop the infinite loop when server stops
      schema[CUILLERE_INSTANCE].call(function* () {
        const cases = Object.entries(schema[CUILLERE_CHANNELS])
          .map(([fieldName, input]) => [
            recv(input as any),
            function* (value) {
              for (const output of schema[CUILLERE_CHANNELS_SUBSCRIBERS][fieldName]) {
                yield send(output, { [fieldName]: value })
              }
            },
          ] as Case)

        while (true) { // eslint-disable-line no-constant-condition
          try {
            yield select(...cases)
          } catch (e) {
            // FIXME why did I put a try-catch here?!
          }
        }
      })
    }

    const { bufferCapacity } = this.args

    if (!(field.name in schema[CUILLERE_CHANNELS])) {
      schema[CUILLERE_CHANNELS][field.name] = chan(bufferCapacity)
      schema[CUILLERE_CHANNELS_SUBSCRIBERS][field.name] = new Set()
    }

    console.log(field.name)

    field.subscribe = (): AsyncIterableIterator<any> => {
      const ch = chan()
      schema[CUILLERE_CHANNELS_SUBSCRIBERS][field.name].add(ch)
      const it = range(ch)

      // FIXME make a class for this implementation
      return {
        [Symbol.asyncIterator]() {
          return this
        },

        async next() {
          return it.next()
        },

        async return() {
          schema[CUILLERE_CHANNELS_SUBSCRIBERS][field.name].delete(ch)
          return { done: true, value: null }
        },

        // FIXME throw?
      }
    }
  }
}

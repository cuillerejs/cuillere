import { cuillere, Cuillere, Plugin } from '@cuillere/core'
import { GraphQLSchema } from 'graphql'
import { IExecutableSchemaDefinition, makeExecutableSchema as makeExecutableSchemaTool } from 'graphql-tools'
import { wrapFieldResolvers } from './wrap-field-resolvers'

const CUILLERE_SCHEMA = Symbol('CUILLERE_SCHEMA')
export const CUILLERE_PLUGINS = Symbol('CUILLERE_PLUGINS')
export const CUILLERE_INSTANCE = Symbol('CUILLERE_INSTANCE')
export const CUILLERE_CONTEXT_KEY = Symbol('CUILLERE_CONTEXT_KEY')

export interface CuillereSchema extends GraphQLSchema {
  [CUILLERE_SCHEMA]: true
  [CUILLERE_INSTANCE]?: Cuillere
  [CUILLERE_CONTEXT_KEY]?: string
}

export function makeExecutableSchema<TContext extends any>(definition: IExecutableSchemaDefinition<TContext>): CuillereSchema {
  const resolvers = definition.resolvers && wrapFieldResolvers(definition.resolvers)

  const schema = makeExecutableSchemaTool({ ...definition, resolvers })

  Object.defineProperty(schema, CUILLERE_SCHEMA, {
    enumerable: false,
    value: true,
    writable: false,
  })

  Object.defineProperty(schema, CUILLERE_PLUGINS, {
    enumerable: false,
    set(plugins: Plugin[]) {
      this[CUILLERE_INSTANCE] = cuillere(...plugins)
    },
  })

  return schema as CuillereSchema
}

export function isCuillereSchema(schema: GraphQLSchema): schema is CuillereSchema {
  return CUILLERE_SCHEMA in schema
}

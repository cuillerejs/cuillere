import cuillere, { Plugin } from '@cuillere/core'
import { GraphQLSchema } from 'graphql'
import { IExecutableSchemaDefinition, makeExecutableSchema as makeExecutableSchemaTool } from 'graphql-tools'
import { wrapFieldResolvers, CuillereHolder } from './wrap-field-resolvers'

interface CuillereSchema extends GraphQLSchema {
  setCuillereConfig(options: CuillereSchemaConfig): void
}

interface CuillereSchemaConfig {
  plugins: Plugin[]
  contextKey?: string
}

export function makeExecutableSchema<TContext extends any>(definition: IExecutableSchemaDefinition<TContext>): CuillereSchema {
  const cuillereHolder: CuillereHolder = {}
  const resolvers = definition.resolvers && wrapFieldResolvers(definition.resolvers, cuillereHolder)
  const schema = makeExecutableSchemaTool({ ...definition, resolvers })
  return Object.assign(schema, { setCuillereConfig: ({ plugins, contextKey }: CuillereSchemaConfig) => {
    cuillereHolder.cllr = cuillere(...plugins)
    cuillereHolder.contextKey = contextKey
  } })
}

export function isCuillereExecutableSchema(schema: GraphQLSchema): schema is CuillereSchema {
  return 'setCuillereConfig' in schema
}

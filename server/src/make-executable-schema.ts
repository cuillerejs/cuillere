import cuillere, { Plugin } from '@cuillere/core'
import { GraphQLSchema } from 'graphql'
import { IExecutableSchemaDefinition, makeExecutableSchema as makeExecutableSchemaTool } from 'graphql-tools'
import { wrapFieldResolvers, CuillereHolder } from './graphql'

interface CuillereGraphQLSchema extends GraphQLSchema {
  setCuillereConfig(options: SetCuillereConfigOptions): void
}

interface SetCuillereConfigOptions {
  plugins: Plugin[]
  contextKey?: string
}

export function makeExecutableSchema<TContext extends any>(definition: IExecutableSchemaDefinition<TContext>): CuillereGraphQLSchema {
  const cuillereHolder: CuillereHolder = {}
  const resolvers = definition.resolvers && wrapFieldResolvers(definition.resolvers, cuillereHolder)
  const schema = makeExecutableSchemaTool({ ...definition, resolvers })
  return Object.assign(schema, { setCuillereConfig: ({ plugins, contextKey }: SetCuillereConfigOptions) => {
    cuillereHolder.cllr = cuillere(...plugins)
    cuillereHolder.contextKey = contextKey
  } })
}

export function isCuillereExecutableSchema(schema: GraphQLSchema): schema is CuillereGraphQLSchema {
  return 'setCuillereConfig' in schema
}

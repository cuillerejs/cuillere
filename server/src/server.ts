import { Plugin } from '@cuillere/core'
import type { ContextFunction, PluginDefinition, Config as ApolloConfig } from 'apollo-server-core'
import { ApolloServer, ServerRegistration } from 'apollo-server-koa'
import Application from 'koa'

import { apolloServerPlugin, ApolloServerPluginArgs } from './apollo-server-plugin'
import { GetAsyncTaskManager } from './task-manager'
import { koaMiddleware, KoaMiddlewareArgs } from './koa-middleware'
import { defaultContextKey } from './context'
import { CUILLERE_CONTEXT_KEY, CUILLERE_PLUGINS, isCuillereSchema, makeExecutableSchema } from './schema'

export interface CuillereConfig {
  contextKey?: string
  httpRequestTaskManager?: GetAsyncTaskManager<KoaMiddlewareArgs>
  graphqlRequestTaskManager?: GetAsyncTaskManager<ApolloServerPluginArgs>
  plugins: Plugin[]
}

export class CuillereServer extends ApolloServer {
  private cuillereConfig: CuillereConfig

  constructor(apolloConfig: ApolloConfig, config: CuillereConfig) {
    super(buildApolloConfig(defaultConfig(config), apolloConfig))

    this.cuillereConfig = defaultConfig(config)
  }

  applyMiddleware(serverRegistration: ServerRegistration) {
    const { httpRequestTaskManager: taskManager, contextKey } = this.cuillereConfig

    if (taskManager) {
      serverRegistration.app.use(koaMiddleware({
        context: ctx => ctx[contextKey] = {}, // eslint-disable-line no-return-assign
        taskManager,
      }))
    }

    super.applyMiddleware(serverRegistration)
  }

  listen(...args: Parameters<typeof Application.prototype.listen>) {
    const app = new Application()

    this.applyMiddleware({ app })

    return app.listen(...args)
  }
}

function defaultConfig(config: CuillereConfig): CuillereConfig {
  return {
    ...config,
    contextKey: config.contextKey ?? defaultContextKey,
  }
}

function buildApolloConfig(config: CuillereConfig, apolloConfig: ApolloConfig): ApolloConfig {
  const apolloConfigOverride: ApolloConfig = {
    context: getContextFunction(config, apolloConfig),
    plugins: mergePlugins(config, apolloConfig),
  }

  if (apolloConfig.schema) {
    if (!isCuillereSchema(apolloConfig.schema)) {
      throw new Error('To make an executable schema, please use `makeExecutableSchema` from `@cuillere/server`.')
    }

    apolloConfig.schema[CUILLERE_PLUGINS] = config.plugins
    apolloConfig.schema[CUILLERE_CONTEXT_KEY] = config.contextKey
  } else {
    apolloConfigOverride.schema = makeExecutableSchema({
      parseOptions: apolloConfig.parseOptions,
      resolvers: apolloConfig.resolvers,
      // resolverValidationOptions?: IResolverValidationOptions
      schemaDirectives: apolloConfig.schemaDirectives, // possibility to add directives...
      typeDefs: apolloConfig.typeDefs, // possibility to extend typeDefs...
    })
  }

  return {
    ...apolloConfig,
    ...apolloConfigOverride,
  }
}

function getContextFunction({ contextKey }: CuillereConfig, { context } : ApolloConfig): ContextFunction {
  if (typeof context === 'function') {
    return async arg => ({
      ...await context(arg),
      [contextKey]: arg.ctx?.[contextKey], // FIXME subscriptions?
    })
  }

  return ({ ctx }) => ({
    ...context,
    [contextKey]: ctx?.[contextKey], // FIXME subscriptions?
  })
}

function mergePlugins(config: CuillereConfig, { plugins } : ApolloConfig): PluginDefinition[] {
  const plugin = getApolloServerPlugin(config)

  if (!plugin) return plugins

  return [
    ...(plugins ?? []),
    plugin,
  ]
}

function getApolloServerPlugin(config: CuillereConfig) {
  const { graphqlRequestTaskManager: taskManager, contextKey } = config

  if (!taskManager) return null

  return apolloServerPlugin({
    context: reqCtx => reqCtx.context[contextKey] = {}, // eslint-disable-line no-return-assign
    taskManager,
  })
}

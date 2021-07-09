import { Plugin } from '@cuillere/core'
import type { ContextFunction, PluginDefinition, Config as ApolloConfig } from 'apollo-server-core'
import { ApolloServer, ServerRegistration } from 'apollo-server-koa'
import Application from 'koa'

import { apolloServerPlugin } from './apollo-server-plugin'
import { AsyncTaskManager, TaskListener } from './task-manager'
import { koaMiddleware } from './koa-middleware'
import { defaultContextKey } from './context'
import { CUILLERE_CONTEXT_KEY, CUILLERE_PLUGINS, isCuillereSchema, makeExecutableSchema } from './schema'
import { ServerPlugin } from './server-plugin'

export interface CuillereConfig {
  contextKey?: string
  plugins?: ServerPlugin[]
}

export class CuillereServer extends ApolloServer {
  private cuillereConfig: CuillereConfig

  constructor(apolloConfig: ApolloConfig, config: CuillereConfig) {
    super(buildApolloConfig(defaultConfig(config), apolloConfig))

    this.cuillereConfig = defaultConfig(config)
  }

  applyMiddleware(serverRegistration: ServerRegistration) {
    const { contextKey, plugins } = this.cuillereConfig

    const listenerGetters = plugins?.flatMap(plugin => plugin.httpRequestListeners ?? []) ?? []

    if (listenerGetters.length !== 0) {
      serverRegistration.app.use(koaMiddleware({
        context: ctx => ctx[contextKey] = {}, // eslint-disable-line no-return-assign
        taskManager(...args) {
          const listeners = listenerGetters
            .map(listenerGetter => listenerGetter(...args))
            .filter((listener): listener is TaskListener => listener != null)
          if (listeners.length === 0) return
          return new AsyncTaskManager(...listeners)
        },
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
    ...apolloConfig,
    context: getContextFunction(config, apolloConfig),
    plugins: mergeApolloPlugins(config, apolloConfig),
  }

  if (apolloConfig.schema) {
    if (!isCuillereSchema(apolloConfig.schema)) {
      throw new Error('To make an executable schema, please use `makeExecutableSchema` from `@cuillere/server`.')
    }
  } else {
    apolloConfigOverride.schema = makeExecutableSchema({
      parseOptions: apolloConfig.parseOptions,
      resolvers: apolloConfig.resolvers,
      schemaDirectives: apolloConfig.schemaDirectives, // possibility to add directives...
      typeDefs: apolloConfig.typeDefs, // possibility to extend typeDefs...
    })
  }

  apolloConfigOverride.schema[CUILLERE_PLUGINS] = getCuillerePlugins(config)
  apolloConfigOverride.schema[CUILLERE_CONTEXT_KEY] = config.contextKey

  return apolloConfigOverride
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

function mergeApolloPlugins(config: CuillereConfig, { plugins } : ApolloConfig): PluginDefinition[] {
  const plugin = getApolloServerPlugin(config)

  if (!plugin) return plugins

  return [
    ...(plugins ?? []),
    plugin,
  ]
}

function getApolloServerPlugin(config: CuillereConfig) {
  const { contextKey, plugins } = config

  const listenerGetters = plugins?.flatMap(plugin => plugin.graphqlRequestListeners ?? []) ?? []

  if (listenerGetters.length === 0) return null

  return apolloServerPlugin({
    context: reqCtx => reqCtx.context[contextKey] = {}, // eslint-disable-line no-return-assign
    taskManager(...args) {
      const listeners = listenerGetters
        .map(listenerGetter => listenerGetter(...args))
        .filter((listener): listener is TaskListener => listener != null)
      if (listeners.length === 0) return
      return new AsyncTaskManager(...listeners)
    },
  })
}

function getCuillerePlugins({ plugins }: CuillereConfig): Plugin[] {
  return plugins?.flatMap(plugin => plugin.plugins ?? []) ?? []
}

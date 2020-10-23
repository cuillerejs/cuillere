import cuillere, { Plugin } from '@cuillere/core'
import type { ContextFunction, PluginDefinition, Config as ApolloConfig } from 'apollo-server-core'
import { ApolloServer, ServerRegistration } from 'apollo-server-koa'
import Application from 'koa'

import { apolloServerPlugin, ApolloServerPluginArgs } from './apollo-server-plugin'
import { GetAsyncTaskManager } from './task-manager'
import { koaMiddleware, KoaMiddlewareArgs } from './koa-middleware'
import { wrapFieldResolvers } from './graphql'

export interface CuillereConfig {
  contextKey?: string
  httpRequestTaskManager?: GetAsyncTaskManager<KoaMiddlewareArgs>
  graphqlRequestTaskManager?: GetAsyncTaskManager<ApolloServerPluginArgs>
  plugins: Plugin[]
}

export class CuillereServer extends ApolloServer {
  #config: CuillereConfig

  constructor(apolloConfig: ApolloConfig, config: CuillereConfig) {
    super(buildApolloConfig(defaultConfig(config), apolloConfig))

    this.#config = defaultConfig(config)
  }

  applyMiddleware(serverRegistration: ServerRegistration) {
    const { httpRequestTaskManager: taskManager, contextKey } = this.#config

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

const defaultContextKey = 'cuillere'

function defaultConfig(config: CuillereConfig): CuillereConfig {
  return {
    ...config,
    contextKey: config.contextKey ?? defaultContextKey,
  }
}

function buildApolloConfig(config: CuillereConfig, apolloConfig: ApolloConfig): ApolloConfig {
  return {
    ...apolloConfig,
    context: getContextFunction(config, apolloConfig),
    plugins: mergePlugins(config, apolloConfig),
    resolvers: apolloConfig.resolvers && wrapFieldResolvers(apolloConfig.resolvers, cuillere(...config.plugins)),
  }
}

function getContextFunction({ contextKey }: CuillereConfig, { context }: ApolloConfig): ContextFunction {
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

function mergePlugins(config: CuillereConfig, { plugins }: ApolloConfig): PluginDefinition[] {
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

import { Plugin } from '@cuillere/core'
import { Context, ContextFunction, GraphQLServiceContext } from 'apollo-server-core'
import { GraphQLServerListener } from 'apollo-server-plugin-base'

import { ApolloServerPluginArgs } from './apollo-server-plugin'
import { KoaMiddlewareArgs } from './koa-middleware'
import { TaskListener } from './task-manager'
import { OneOrMany, ValueOrPromise } from './types'

export type ServerPlugin = {
  graphqlContext?: Context | ContextFunction
  httpRequestListeners?: OneOrMany<GetTaskListener<KoaMiddlewareArgs>>
  graphqlRequestListeners?: OneOrMany<GetTaskListener<ApolloServerPluginArgs>>
  plugins?: OneOrMany<Plugin>
  serverWillStart?: (service: GraphQLServiceContext) => ValueOrPromise<GraphQLServerListener>
}

export interface GetTaskListener<Args extends any[]> {
  (...args: Args): TaskListener | void
}

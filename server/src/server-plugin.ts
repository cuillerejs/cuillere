import { Plugin, GeneratorFunction } from '@cuillere/core'
import { Context, ContextFunction, GraphQLServiceContext } from 'apollo-server-core'
import { GraphQLServerListener } from 'apollo-server-plugin-base'

import { ApolloServerPluginArgs } from './apollo-server-plugin'
import { KoaMiddlewareArgs } from './koa-middleware'
import { AsyncTaskManager, GetAsyncTaskManager, TaskListener } from './task-manager'
import { OneOrMany } from './types'

export type ServerPlugin = {
  graphqlContext?: Context | ContextFunction
  httpRequestListeners?: OneOrMany<GetTaskListener<KoaMiddlewareArgs>>
  graphqlRequestListeners?: OneOrMany<GetTaskListener<ApolloServerPluginArgs>>
  plugins?: OneOrMany<Plugin>
  serverWillStart?: GeneratorFunction<[GraphQLServiceContext], GraphQLServerListener>
}

export interface GetTaskListener<Args extends any[]> {
  (...args: Args): TaskListener | void
}

export function makeAsyncTaskManagerGetterForListenerGetters<Args extends any[]>(listenerGetters: GetTaskListener<Args>[]): GetAsyncTaskManager<Args> {
  return (...args) => {
    const listeners = listenerGetters
      .map(listenerGetter => listenerGetter(...args))
      .filter((listener): listener is TaskListener => listener != null)
    if (listeners.length === 0) return
    return new AsyncTaskManager(...listeners)
  }
}

export interface CuillereServerListener {
  serverWillStop?: GeneratorFunction
}

import { Plugin } from '@cuillere/core'
import type { Context, ContextFunction, GraphQLServiceContext } from 'apollo-server-core'
import type { BaseContext, GraphQLRequestContextExecutionDidStart, GraphQLServerListener } from 'apollo-server-plugin-base'
import type { ParameterizedContext, DefaultState, DefaultContext } from 'koa'

import { TaskListener } from './task-manager'
import { OneOrMany, ValueOrPromise } from './types'

export type ServerPlugin = {
  graphqlContext?: Context | ContextFunction
  httpRequestListeners?: OneOrMany<GetTaskListener<[ParameterizedContext<DefaultState, DefaultContext>]>>
  graphqlRequestListeners?: OneOrMany<GetTaskListener<[GraphQLRequestContextExecutionDidStart<BaseContext>]>>
  plugins?: OneOrMany<Plugin>
  serverWillStart?(service: GraphQLServiceContext): ValueOrPromise<GraphQLServerListener | void>
}

export interface GetTaskListener<Args extends any[]> {
  (...args: Args): TaskListener | void
}

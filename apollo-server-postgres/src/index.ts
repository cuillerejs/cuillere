import { ApolloServer } from 'apollo-server'
import express from 'express'
import {
  CorsOptions,
  ApolloServerExpressConfig,
} from 'apollo-server-express'
import { PoolConfig, PoolProvider } from '@cuillere/postgres'

export * from 'apollo-server'

type ApolloServerConfig = ApolloServerExpressConfig & {
  cors?: CorsOptions | boolean
  onHealthCheck?: (req: express.Request) => Promise<any>
}

export interface BaseCrud {
  get(id: any): any
  all(): any
  list(criteria: any): any
}

export type Crud = Record<string, BaseCrud>

export interface CrudFactory {
  (params: { crud: Crud }): Record<string, (...args: any[]) => any>
}

export interface CuillereApolloServerPostgresConfig {
  crud: Record<string, CrudFactory> | Record<string, CrudFactory>[]

  pgPoolConfig?: PoolConfig | PoolConfig[]
  pgPoolProvider?: PoolProvider
}

export class CuillereApolloServerPostgres extends ApolloServer {
  #pgPoolConfig?: PoolConfig | PoolConfig[]

  #pgPoolProvider?: PoolProvider

  constructor(
    config: ApolloServerConfig & CuillereApolloServerPostgresConfig,
  ) {
    super(config)

    this.#pgPoolConfig = config.pgPoolConfig
    this.#pgPoolProvider = config.pgPoolProvider
  }

  get crud(): Record<string, BaseCrud> {
    return this['asdsa.adas']
  }
}

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

export interface BaseCrud<T = any> {
  get(id: any): T
  all(): T[]
  list(criteria: any): T[]
}

export type Crud = Record<string, BaseCrud> & (<T>(name: string) => BaseCrud<T>)

export interface CrudFactory<T = any> {
  (params: { crud: BaseCrud<T> }): Record<string, (...args: any[]) => any>
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

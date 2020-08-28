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

interface CuillereApolloServerPostgresConfig {
  pgPoolConfigs?: PoolConfig[]
  pgPoolProvider?: PoolProvider
}

export class CuillereApolloServerPostgres extends ApolloServer {
  #pgPoolConfigs?: PoolConfig[]

  #pgPoolProvider?: PoolProvider

  constructor(
    config: ApolloServerConfig & CuillereApolloServerPostgresConfig,
  ) {
    super(config)

    this.#pgPoolConfigs = config.pgPoolConfigs
    this.#pgPoolProvider = config.pgPoolProvider
  }
}

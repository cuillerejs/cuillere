import { CuillereServer as CuillereServerBase, Config as ApolloConfig, CuillereConfig } from '@cuillere/server'
import { PostgresConfig, postgresServerPlugin } from '@cuillere/postgres'

export class CuillereServer extends CuillereServerBase {
  constructor(apolloConfig: ApolloConfig, config: CuillereConfig & PostgresConfig) {
    super(
      apolloConfig,
      {
        contextKey: config.contextKey,
        plugins: [
          ...(config.plugins ?? []),
          postgresServerPlugin(config),
        ],
      },
    )
  }
}

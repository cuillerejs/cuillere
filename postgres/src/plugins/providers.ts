import { OperationObject, Plugin, Wrapper, next } from '@cuillere/core'
import { PoolProvider, PoolConfig } from '../pool-provider'
import { setQueryHandler } from './query'
import { ClientManager } from '../client-manager'
import { TransactionManager, TransactionManagerOptions } from '../transaction-manager'

export function poolPlugin(options: ProviderPluginOptions): Plugin {
  return makeProviderPlugin(options, provider => new ClientManager(provider))
}

export function transactionPlugin(options: ProviderPluginOptions, transactionOptions?: TransactionManagerOptions): Plugin {
  return makeProviderPlugin(options, provider => new TransactionManager(provider, transactionOptions))
}

export interface ProviderPluginOptions {
  poolProvider?: PoolProvider
  poolConfigs?: PoolConfig[]
}

const namespace = '@cuillere/postgres/provider'

function makeProviderPlugin(
  options: ProviderPluginOptions,
  clientManagerFactory: (provider: PoolProvider) => ClientManager,
): Plugin {
  function createClientManager() {
    const provider = options.poolProvider ?? new PoolProvider(...options.poolConfigs)
    return clientManagerFactory(provider)
  }

  return {
    namespace,

    handlers: {
      async* '@cuillere/core/start'(operation: Wrapper, ctx: ProviderContext) {
        const clientManager = ctx[MANAGER] = createClientManager()
        setQueryHandler(ctx, query => clientManager.query(query))
        return yield* clientManager.transactionalYield(next(operation))
      },

      async* getClient(operation: GetClientOperation, ctx: ProviderContext) {
        return ctx[MANAGER].getClient(operation.name)
      },
    },
  }
}

export function getClient(name?: string): GetClientOperation {
  return { kind: `${namespace}/getClient`, name }
}

interface GetClientOperation extends OperationObject {
  name?: string
}

const MANAGER = Symbol('MANAGER')
interface ProviderContext {
  [MANAGER]: ClientManager
}

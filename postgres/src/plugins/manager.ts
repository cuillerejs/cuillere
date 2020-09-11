import { Plugin, Wrapper, next } from '@cuillere/core'

import { ClientManager, ClientManagerOptions } from '../client-manager'
import { TransactionManager, TransactionManagerOptions } from '../transaction-manager'

export function clientManagerPlugin(options: ClientManagerOptions): Plugin {
  return managerPlugin(new ClientManager(options))
}

export function transactionManagerPlugin(options: TransactionManagerOptions): Plugin {
  return managerPlugin(new TransactionManager(options))
}

function managerPlugin(manager: ClientManager): Plugin {
  return {
    handlers: {
      async* '@cuillere/core/start'(operation: Wrapper, ctx) {
        manager.setupContext(ctx)
        return yield* manager.transactionalYield(next(operation))
      },
    },
  }
}

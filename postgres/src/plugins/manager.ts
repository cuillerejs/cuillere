import { Plugin, next } from '@cuillere/core'

import { getClientManager, ClientManagerOptions } from '../client-manager'

export function managerPlugin(options: ClientManagerOptions): Plugin {
  return {
    handlers: {
      async* '@cuillere/core/start'(operation, ctx) {
        return yield* getClientManager(options).executeYield(ctx, next(operation))
      },
    },
  }
}

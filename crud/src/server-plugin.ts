import { delegate } from '@cuillere/core'
import type { ServerPlugin } from '@cuillere/server'

export function crudServerPlugin(): ServerPlugin {
  return {
    // FIXME build crud object in serverWillStart

    plugins: {
      handlers: {
        * '@cuillere/start'(operation) {
          // FIXME add crud object in context...
          yield delegate(operation)
        },
      },
    },
  }
}

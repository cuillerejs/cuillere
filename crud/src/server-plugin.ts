import { delegate, ServerPlugin } from '@cuillere/server'

export function crudServerPlugin(): ServerPlugin {
  return {
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

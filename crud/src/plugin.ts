import type { OperationObject, Plugin } from '@cuillere/core'

const namespace = '@cuillere/crud'

export function crudPlugin(): Plugin {
  return {
    namespace,

    handlers: {
      * describe() {
        // Catch describe opeation
      },
    },
  }
}

export function describe(): OperationObject {
  return { kind: `${namespace}/describe` }
}

import type { OperationObject, Plugin } from '@cuillere/core'

const namespace = '@cuillere/crud'

export function crudPlugin(): Plugin {
  return {
    namespace,

    handlers: {
      * build() {
        // Catch build opeation
      },
    },
  }
}

export function build(): BuildCrud {
  return { kind: `${namespace}/build`, cruds: [] }
}

export interface BuildCrud extends OperationObject {
  cruds: Crud[]
}

export interface Crud {

}

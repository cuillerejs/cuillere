import type { DocumentNode } from 'graphql'

export function isMutation(docuemnt: DocumentNode) {
  return docuemnt.definitions.some(def => def.kind === 'OperationDefinition' && def.operation === 'mutation')
}

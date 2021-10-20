import { Operation, Wrapper, isOfKind, coreNamespace } from './operation'

const kind = `${coreNamespace}/next`

export interface NextOperation<T extends Operation = Operation> extends Wrapper<T> {
  terminal?: true
}

export function next<T extends Operation = Operation>(operation: T): NextOperation<T> {
  return { kind, operation }
}

export function delegate<T extends Operation = Operation>(operation: T): NextOperation<T> {
  return { kind, operation, terminal: true }
}

export const isNext = isOfKind<Wrapper<Operation>>(kind)

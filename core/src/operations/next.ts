import { OperationObject, Wrapper, isOfKind, coreNamespace } from './operation'

const kind = `${coreNamespace}/next`

export function next(operation: OperationObject): Wrapper<OperationObject> {
  return { kind, operation }
}

export const isNext = isOfKind<Wrapper<OperationObject>>(kind)

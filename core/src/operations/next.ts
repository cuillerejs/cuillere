import { OperationObject, Wrapper, isOfKind } from './operation'

export function next(operation: OperationObject): Wrapper<OperationObject> {
  return { kind: 'next', operation }
}

export const isNext = isOfKind<Wrapper<OperationObject>>('next')

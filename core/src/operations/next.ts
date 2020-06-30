import { OperationObject, Wrapper, isKind } from './operation'

export function next(operation: OperationObject): Wrapper<OperationObject> {
  return {
    kind: 'next',
    operation,
  }
}

export const isNext = isKind<Wrapper<OperationObject>>('next')

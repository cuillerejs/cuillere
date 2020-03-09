import { Operation, Wrapper } from './operation'

export function next(operation: Operation): Wrapper {
  return {
    kind: 'next',
    operation,
  }
}

export function isNext(operation: Operation): operation is Wrapper {
  return operation?.kind === 'next'
}

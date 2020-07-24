import { Operation, Wrapper, coreNamespace } from './operation'

const kind = `${coreNamespace}/start`

export function start(operation: Operation): Wrapper {
  return { kind, operation }
}

import { delegate, makeOperation } from '../operations'
import { Middleware } from './middleware'

export const contextMiddleware = (): Middleware =>
  function* contextMiddleware(operation, ctx) {
    if (isGet(operation)) {
      checkKey(operation.key)
      return ctx[operation.key]
    }
    if (isSet(operation)) {
      checkKey(operation.key)
      ctx[operation.key] = operation.value
      return
    }

    return yield delegate(operation)
  }

type ContextKey = string | number | symbol

interface Set {
  key: ContextKey
  value: any
}

interface Get {
  key: ContextKey
}

export const [get, isGet] = makeOperation(Symbol('GET'), (op, key: ContextKey): Get => ({ ...op, key }))

export const [set, isSet] = makeOperation(Symbol('SET'), (op, key: ContextKey, value: any): Set => ({ ...op, key, value }))

function checkKey(key: any) {
  const keyType = typeof key
  if (keyType !== 'string' && keyType !== 'number' && keyType !== 'symbol') {
    throw new Error('context keys should be string, number or symbol')
  }
}

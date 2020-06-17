import { Middleware } from './middleware'
import { OperationObject } from '../operations'

export const contextMiddleware = (): Middleware => ({
  * get({ key }: Get, ctx) {
    return ctx[key]
  },

  * set({ key, value }: Set, ctx) {
    ctx[key] = value
  },
})

export function get(key: ContextKey): Get {
  return {
    kind: 'get',
    key,
  }
}

export function set(key: ContextKey, value: any): Set {
  return {
    kind: 'set',
    key,
    value,
  }
}

export interface Get extends OperationObject {
  key: ContextKey
}

export interface Set extends OperationObject {
  key: ContextKey
  value: any
}

export type ContextKey = string | number | symbol

import { Plugin } from './plugin'
import { OperationObject } from '../operations'

const namespace = '@cuillere/context'

export const contextPlugin = (): Plugin => ({
  namespace,

  handlers: {
    * get({ key }: Get, ctx) {
      return ctx[key]
    },

    * set({ key, value }: Set, ctx) {
      ctx[key] = value
    },
  },
})

export function get(key: ContextKey): Get {
  return { kind: `${namespace}/get`, key }
}

export function set(key: ContextKey, value: any): Set {
  return { kind: `${namespace}/set`, key, value }
}

export interface Get extends OperationObject {
  key: ContextKey
}

export interface Set extends OperationObject {
  key: ContextKey
  value: any
}

export type ContextKey = string | number | symbol

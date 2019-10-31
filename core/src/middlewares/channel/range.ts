import { ChannelsContext } from './channel'
import { doRecv } from './recv'

const RANGE = Symbol('RANGE')

export interface Range {
  [RANGE]: true
  chanKey: object
}

export const isRange = (operation: any): operation is Range => operation && operation[RANGE]

export const range = (chanKey: object): Range => ({
  [RANGE]: true,
  chanKey,
})

export const doRange = (ctx: ChannelsContext, chanKey: object) => {
  const it: AsyncIterableIterator<any> = {
    next: async () => {
      const [value, ok] = await doRecv(ctx, chanKey)
      return {
        value,
        done: !ok,
      }
    },

    [Symbol.asyncIterator]: () => it,
  }
  return it
}

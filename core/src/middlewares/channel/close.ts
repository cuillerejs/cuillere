import { ChannelsContext, Recver, getChan } from './channel'

const CLOSE = Symbol('CLOSE')

export interface Close {
  [CLOSE]: true
  chanKey: object
}

export const isClose = (operation: any): operation is Close => operation && operation[CLOSE]

export const close = (chanKey: object): Close => ({
  [CLOSE]: true,
  chanKey,
})

export const doClose = (ctx: ChannelsContext, chanKey: object) => {
  const ch = getChan(ctx, chanKey)

  if (ch.closed) throw TypeError(`close on closed ${chanKey}`)

  ch.closed = true

  let recver: Recver
  while (recver = ch.recvQ.shift()) recver([undefined, false])
}

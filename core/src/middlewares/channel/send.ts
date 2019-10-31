import { ChannelsContext, getChan } from './channel'

const SEND = Symbol('SEND')

export interface Send {
  [SEND]: true
  chanKey: object
  value: any
}

export const isSend = (operation: any): operation is Send => operation && operation[SEND]

export const send = (chanKey: object, value: any): Send => ({
  [SEND]: true,
  chanKey,
  value,
})

export const isSendReady = (ctx: ChannelsContext, { chanKey }: Send): boolean => {
  const ch = getChan(ctx, chanKey)
  if (ch.closed) throw TypeError(`send on closed ${chanKey}`)
  return ch.recvQ.length() !== 0 || ch.bufferSize !== ch.buffer.length
}

export const syncSend = (ctx: ChannelsContext, chanKey: object, value: any): boolean => {
  const ch = getChan(ctx, chanKey)

  if (ch.closed) throw TypeError(`send on closed ${chanKey}`)

  const recver = ch.recvQ.shift()
  if (recver) {
    recver([value, true])
    return true
  }

  if (ch.bufferSize !== ch.buffer.length) {
    ch.buffer[ch.bufferSize++] = value
    return true
  }

  return false
}

export const doSend = async (ctx: ChannelsContext, chanKey: object, value: any) => {
  if (syncSend(ctx, chanKey, value)) return

  await new Promise<void>(resolve => getChan(ctx, chanKey).sendQ.push(() => {
    resolve()
    return value
  }))
}

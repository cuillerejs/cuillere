import { ChannelsContext, getChan } from './channel'

const RECV = Symbol('RECV')

export interface Recv {
  [RECV]: true
  chanKey: object
  detail: boolean
}

export const isRecv = (operation: any): operation is Recv => operation && operation[RECV]

export const recv = (chanKey: object, detail = false): Recv => ({
  [RECV]: true,
  chanKey,
  detail,
})

export const isRecvReady = (ctx: ChannelsContext, { chanKey }: Recv): boolean => {
  const ch = getChan(ctx, chanKey)
  return ch.bufferSize !== 0 || ch.sendQ.length() !== 0 || ch.closed
}

export const syncRecv = (ctx: ChannelsContext, chanKey: object): [any, boolean] => {
  const ch = getChan(ctx, chanKey)

  if (ch.bufferSize !== 0) {
    const value = ch.buffer[0]
    ch.buffer.copyWithin(0, 1)

    const sender = ch.sendQ.shift()
    if (sender) ch.buffer[ch.bufferSize - 1] = sender()
    else ch.bufferSize--

    return [value, true]
  }

  const sender = ch.sendQ.shift()
  if (sender) return [sender(), true]

  if (ch.closed) return [undefined, false]

  return undefined
}

export const doRecv = async (ctx: ChannelsContext, chanKey: object) => {
  const res = syncRecv(ctx, chanKey)
  if (res) return res

  return new Promise<[any, boolean]>(resolve => getChan(ctx, chanKey).recvQ.push(resolve))
}

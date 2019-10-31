const CHAN = Symbol('CHAN')

export interface Chan {
  [CHAN]: true
  bufferSize: number
}

export const isChan = (operation): operation is Chan => operation && operation[CHAN]

export const chan = (bufferSize = 0): Chan => ({
  [CHAN]: true,
  bufferSize,
})

export const CHANS = Symbol('CHANS')

let nextChanId = 1

const chanKey = (bufferSize: number) => new String(`chan #${nextChanId++} { bufferSize: ${bufferSize} }`)

interface Cancellable {
  cancelled?: true
}

export class ChanQ<T extends Cancellable> {
  private q: T[] = []

  public push(r: T) {
    this.q.push(r)
  }

  public shift(): T {
    let r: T
    while (r = this.q.shift()) {
      if (!r.cancelled) return r
    }
    return undefined
  }

  public length() {
    return this.q.filter(r => !r.cancelled).length
  }
}

export interface Sender extends Cancellable {
  (): any
}

export interface Recver extends Cancellable {
  ([any, boolean]): void
}

interface ChanState {
  buffer: any[]
  bufferSize: number
  sendQ: ChanQ<Sender>
  recvQ: ChanQ<Recver>
  closed: boolean
}

export interface ChannelsContext {
  [CHANS]: WeakMap<object, ChanState>
}

export const doChan = (ctx: ChannelsContext, bufferSize: number) => {
  const key = chanKey(bufferSize)

  ctx[CHANS].set(key, {
    buffer: Array(bufferSize),
    bufferSize: 0,
    sendQ: new ChanQ(),
    recvQ: new ChanQ(),
    closed: false,
  })

  return key
}

export const getChan = (ctx: ChannelsContext, chanKey: object) => ctx[CHANS].get(chanKey)

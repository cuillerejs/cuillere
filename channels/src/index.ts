import { Plugin, OperationObject, delegate, execute, isGenerator, isOfKind } from '@cuillere/core'

const namespace = '@cuillere/channels'

export function channelsPlugin(): Plugin<ChannelsContext> {
  return {
    namespace,

    handlers: {
      * '@cuillere/core/start'(operation, ctx) {
        ctx[CHANS] = new WeakMap()
        yield delegate(operation)
      },

      * chan({ bufferCapacity }: Chan, ctx) {
        const key = chanKey(bufferCapacity)

        ctx[CHANS].set(key, {
          buffer: Array(bufferCapacity),
          bufferLength: 0,
          sendQ: new ChanQ(),
          recvQ: new ChanQ(),
          closed: false,
        })

        return key
      },

      * close({ chanKey }: ChanOperation, ctx) {
        const ch = ctx[CHANS].get(chanKey)

        if (ch.closed) throw TypeError(`close on closed ${chanKey}`)

        ch.closed = true

        let recver: Recver
        while (recver = ch.recvQ.shift()) recver([undefined, false])
      },

      * range({ chanKey }: ChanOperation, ctx) {
        return {
          async next() {
            const [value, ok] = await doRecv(ctx, chanKey)
            return {
              value,
              done: !ok,
            }
          },

          [Symbol.asyncIterator]() {
            return this
          },
        }
      },

      async* recv({ chanKey, detail }: Recv, ctx) {
        const res = await doRecv(ctx, chanKey)
        return detail ? res : res[0]
      },

      async* select({ cases }: Select, ctx) {
        const simpleCases = cases.map(caze => (isCallbackCase(caze) ? caze[0] : caze))
        const indexes = new Map(simpleCases.map((caze, i) => [caze, i]))
        const callbacks = new Map(cases.filter(isCallbackCase))

        const readyCases = simpleCases.filter((caze) => {
          if (isDefault(caze)) return false
          if (isSend(caze)) return isSendReady(ctx, caze)
          if (isRecv(caze)) return isRecvReady(ctx, caze)
          throw new TypeError('unknown case type')
        }) as (Send | Recv)[]

        if (readyCases.length !== 0) {
          const caze = readyCases[
            readyCases.length === 1 ? 0 : Math.floor(Math.random() * readyCases.length)
          ]
          const index = indexes.get(caze)
          if (isSend(caze)) {
            syncSend(ctx, caze.chanKey, caze.value)
            if (callbacks.has(caze)) yield* executeCallback(callbacks.get(caze))
            return [index]
          }
          if (isRecv(caze)) {
            const res = syncRecv(ctx, caze.chanKey)
            const ret = caze.detail ? res : res[0]
            if (callbacks.has(caze)) yield* executeCallback(callbacks.get(caze), [ret])
            return [index, ret]
          }
        }

        if (indexes.has(DEFAULT)) {
          if (callbacks.has(DEFAULT)) yield* executeCallback(callbacks.get(DEFAULT))
          return [indexes.get(DEFAULT)]
        }

        const casesByChanKey = new Map<ChanKey, [Send[], Recv[]]>()
        for (const caze of simpleCases) {
          if (isDefault(caze)) return
          if (casesByChanKey.has(caze.chanKey)) {
            if (isSend(caze)) casesByChanKey.get(caze.chanKey)[0].push(caze)
            if (isRecv(caze)) casesByChanKey.get(caze.chanKey)[1].push(caze)
          } else {
            if (isSend(caze)) casesByChanKey.set(caze.chanKey, [[caze], []])
            if (isRecv(caze)) casesByChanKey.set(caze.chanKey, [[], [caze]])
          }
        }

        const [caze, res] = await new Promise<[Send] | [Recv, [any, boolean]]>((resolve) => {
          const resolvers: (Sender | Recver)[] = []
          const cancel = () => resolvers.forEach((resolver) => {
            resolver.cancelled = true // eslint-disable-line no-param-reassign
          })

          for (const [chanKey, [sends, recvs]] of casesByChanKey.entries()) {
            const ch = ctx[CHANS].get(chanKey)

            if (sends.length !== 0) {
              const sender: Sender = () => {
                cancel()
                const send = sends.length === 1 ? sends[0] : (
                  sends[Math.floor(Math.random() * sends.length)]
                )
                resolve([send])
                return send.value
              }
              ch.sendQ.push(sender)
              resolvers.push(sender)
            }

            if (recvs.length !== 0) {
              const rcver: Recver = (res) => {
                cancel()
                const recv = recvs.length === 1 ? recvs[0] : (
                  recvs[Math.floor(Math.random() * recvs.length)]
                )
                resolve([recv, res])
              }
              ch.recvQ.push(rcver)
              resolvers.push(rcver)
            }
          }
        })

        const index = indexes.get(caze)
        if (isSend(caze)) {
          if (callbacks.has(caze)) yield* executeCallback(callbacks.get(caze))
          return [index]
        }
        if (isRecv(caze)) {
          const ret = caze.detail ? res : res[0]
          if (callbacks.has(caze)) yield* executeCallback(callbacks.get(caze), [ret])
          return [index, ret]
        }
        throw new TypeError('unknown case type')
      },

      async* send({ chanKey, value }: Send, ctx) {
        if (syncSend(ctx, chanKey, value)) return

        await new Promise<void>(resolve => ctx[CHANS].get(chanKey).sendQ.push(() => {
          resolve()
          return value
        }))
      },
    },
  }
}

interface ChannelsContext {
  [CHANS]: WeakMap<ChanKey, ChanState>
}

const CHANS = Symbol('CHANS')

export type ChanKey = object // eslint-disable-line @typescript-eslint/ban-types

interface ChanState {
  buffer: any[]
  bufferLength: number
  sendQ: ChanQ<Sender>
  recvQ: ChanQ<Recver>
  closed: boolean
}

class ChanQ<T extends Cancellable> {
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

interface Cancellable {
  cancelled?: true
}

interface Sender extends Cancellable {
  (): any
}

interface Recver extends Cancellable {
  ([any, boolean]): void
}

export interface ChanOperation extends OperationObject {
  chanKey: ChanKey
}

export interface Chan extends OperationObject {
  bufferCapacity: number
}

export const chan = (bufferCapacity = 0): Chan => ({ kind: `${namespace}/chan`, bufferCapacity })

let nextChanId = 1

const chanKey = (bufferCapacity: number): ChanKey => new String(`chan #${nextChanId++} { bufferCapacity: ${bufferCapacity} }`)

export const close = (chanKey: ChanKey): ChanOperation => ({ kind: `${namespace}/close`, chanKey })

export const range = (chanKey: ChanKey): ChanOperation => ({ kind: `${namespace}/range`, chanKey })

export interface Recv extends ChanOperation {
  detail: boolean
}

export const recv = (chanKey: ChanKey, detail = false): Recv => ({ kind: `${namespace}/recv`, chanKey, detail })

const isRecv = isOfKind<Recv>(`${namespace}/recv`)

const isRecvReady = (ctx: ChannelsContext, { chanKey }: Recv): boolean => {
  const ch = ctx[CHANS].get(chanKey)
  return ch.bufferLength !== 0 || ch.sendQ.length() !== 0 || ch.closed
}

const syncRecv = (ctx: ChannelsContext, chanKey: ChanKey): [any, boolean] => {
  const ch = ctx[CHANS].get(chanKey)

  if (ch.bufferLength !== 0) {
    const value = ch.buffer[0]
    ch.buffer.copyWithin(0, 1)

    const sender = ch.sendQ.shift()
    if (sender) ch.buffer[ch.bufferLength - 1] = sender()
    else ch.bufferLength--

    return [value, true]
  }

  const sender = ch.sendQ.shift()
  if (sender) return [sender(), true]

  if (ch.closed) return [undefined, false]

  return undefined
}

const doRecv = async (ctx: ChannelsContext, chanKey: ChanKey) => {
  const res = syncRecv(ctx, chanKey)
  if (res) return res

  return new Promise<[any, boolean]>(resolve => ctx[CHANS].get(chanKey).recvQ.push(resolve))
}

const DEFAULT = Symbol('DEFAULT')

export type SimpleCase = Send | Recv | typeof DEFAULT

export type CallbackCase = [SimpleCase, (...args: any[]) => any]

export type Case = SimpleCase | CallbackCase

const isCallbackCase = Array.isArray as (caze: Case) => caze is CallbackCase

const isDefault = (caze: Case): caze is typeof DEFAULT => caze === DEFAULT

export interface Select extends OperationObject {
  cases: Case[]
}

export const select = (...cases: Case[]): Select => ({ kind: `${namespace}/select`, cases })
select.default = DEFAULT

export interface Send extends ChanOperation {
  value: any
}

export const send = (chanKey: ChanKey, value: any): Send => ({ kind: `${namespace}/send`, chanKey, value })

const isSend = isOfKind<Send>(`${namespace}/send`)

const isSendReady = (ctx: ChannelsContext, { chanKey }: Send): boolean => {
  const ch = ctx[CHANS].get(chanKey)
  if (ch.closed) throw TypeError(`send on closed ${chanKey}`)
  return ch.recvQ.length() !== 0 || ch.bufferLength !== ch.buffer.length
}

const syncSend = (ctx: ChannelsContext, chanKey: ChanKey, value: any): boolean => {
  const ch = ctx[CHANS].get(chanKey)

  if (ch.closed) throw TypeError(`send on closed ${chanKey}`)

  const recver = ch.recvQ.shift()
  if (recver) {
    recver([value, true])
    return true
  }

  if (ch.bufferLength !== ch.buffer.length) {
    ch.buffer[ch.bufferLength++] = value
    return true
  }

  return false
}

async function* executeCallback(callback: (...args: any[]) => any, args = []) {
  const res = callback(...args)

  if (isGenerator(res)) {
    res.name = callback.name
    yield execute(res)
  } else {
    await res
  }
}

import { Plugin, OperationObject, fork, isOfKind, isGeneratorFunction } from '@cuillere/core'

const namespace = '@cuillere/channels'

const chans = new WeakMap<ChanKey, ChanState>()

export function channelsPlugin(): Plugin {
  return {
    namespace,

    handlers: {
      async* recv({ chanKey, detail }: Recv) {
        const res = await doRecv(chanKey)
        return detail ? res : res[0]
      },

      async* select({ cases }: Select) {
        const simpleCases = cases.map(caze => (isCallbackCase(caze) ? caze[0] : caze))
        const indexes = new Map(simpleCases.map((caze, i) => [caze, i]))
        const callbacks = new Map(cases.filter(isCallbackCase))

        const readyCases = simpleCases.filter((caze) => {
          if (isDefault(caze)) return false
          if (isSend(caze)) return isSendReady(caze)
          if (isRecv(caze)) return isRecvReady(caze)
          throw new TypeError('unknown case type')
        }) as (Send | Recv)[]

        if (readyCases.length !== 0) {
          const caze = readyCases[
            readyCases.length === 1 ? 0 : Math.floor(Math.random() * readyCases.length)
          ]
          const index = indexes.get(caze)
          if (isSend(caze)) {
            syncSend(caze.chanKey, caze.value)
            if (callbacks.has(caze)) yield* executeCallback(callbacks.get(caze))
            return [index]
          }
          if (isRecv(caze)) {
            const res = syncRecv(caze.chanKey)
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
            const ch = chans.get(chanKey)

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

      async* send({ chanKey, value }: Send) {
        if (syncSend(chanKey, value)) return

        await new Promise<void>(resolve => chans.get(chanKey).sendQ.push(() => {
          resolve()
          return value
        }))
      },

      * after({ duration }: After) {
        const ch = chan()
        yield fork(async function* () {
          await new Promise(resolve => setTimeout(resolve, duration))
          yield send(ch, new Date())
        })
        return ch
      },

      * tick({ interval }: Tick) {
        const ch = chan()
        yield fork(async function* () {
          while (true) {
            await new Promise(resolve => setTimeout(resolve, interval))
            yield send(ch, new Date())
          }
        })
        return ch
      },
    },
  }
}

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

export function chan(bufferCapacity = 0): ChanKey {
  const key = chanKey(bufferCapacity)

  chans.set(key, {
    buffer: Array(bufferCapacity),
    bufferLength: 0,
    sendQ: new ChanQ(),
    recvQ: new ChanQ(),
    closed: false,
  })

  return key
}

let nextChanId = 1

function chanKey(bufferCapacity: number): ChanKey {
  return new String(`chan #${nextChanId++} { bufferCapacity: ${bufferCapacity} }`)
}

export function close(chanKey: ChanKey) {
  const ch = chans.get(chanKey)

  if (ch.closed) throw TypeError(`close on closed ${chanKey}`)

  ch.closed = true

  let recver: Recver
  while (recver = ch.recvQ.shift()) recver([undefined, false])
}

export function range(chanKey:ChanKey) {
  return {
    async next() {
      const [value, ok] = await doRecv(chanKey)
      return {
        value,
        done: !ok,
      }
    },

    [Symbol.asyncIterator]() {
      return this
    },
  }
}

export interface Recv extends ChanOperation {
  detail: boolean
}

export function recv(chanKey: ChanKey, detail = false): Recv {
  return { kind: `${namespace}/recv`, chanKey, detail }
}

const isRecv = isOfKind<Recv>(`${namespace}/recv`)

function isRecvReady({ chanKey }: Recv): boolean {
  const ch = chans.get(chanKey)
  return ch.bufferLength !== 0 || ch.sendQ.length() !== 0 || ch.closed
}

function syncRecv(chanKey: ChanKey): [any, boolean] {
  const ch = chans.get(chanKey)

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

async function doRecv(chanKey: ChanKey) {
  const res = syncRecv(chanKey)
  if (res) return res

  return new Promise<[any, boolean]>(resolve => chans.get(chanKey).recvQ.push(resolve))
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

export function select(...cases: Case[]): Select {
  return { kind: `${namespace}/select`, cases }
}
select.default = DEFAULT

export interface Send extends ChanOperation {
  value: any
}

export function send(chanKey: ChanKey, value: any): Send {
  return { kind: `${namespace}/send`, chanKey, value }
}

const isSend = isOfKind<Send>(`${namespace}/send`)

function isSendReady({ chanKey }: Send): boolean {
  const ch = chans.get(chanKey)
  if (ch.closed) throw TypeError(`send on closed ${chanKey}`)
  return ch.recvQ.length() !== 0 || ch.bufferLength !== ch.buffer.length
}

function syncSend(chanKey: ChanKey, value: any): boolean {
  const ch = chans.get(chanKey)

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
  if (isGeneratorFunction(callback)) yield Object.defineProperty(callback(...args), 'name', { value: callback.name })
  else await callback(...args)
}

export interface After extends OperationObject {
  duration: number
}

export function after(duration: number): After {
  return { kind: `${namespace}/after`, duration }
}

export interface Tick extends OperationObject {
  interval: number
}

export function tick(interval: number): Tick {
  return { kind: `${namespace}/tick`, interval }
}

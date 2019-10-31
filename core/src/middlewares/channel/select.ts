import { ChannelsContext, Sender, Recver, getChan } from './channel'
import { Send, isSend, isSendReady, syncSend } from './send'
import { Recv, isRecv, isRecvReady, syncRecv } from './recv'

const SELECT = Symbol('SELECT')

const DEFAULT = Symbol('DEFAULT')

export type Case = Send | Recv | typeof DEFAULT

const isDefault = (caze: Case): caze is typeof DEFAULT => caze === DEFAULT

export interface Select {
  [SELECT]: true
  cases: Case[]
}

export const isSelect = (operation): operation is Select => operation && operation[SELECT]

export const select = (...cases: Case[]): Select => ({
  [SELECT]: true,
  cases,
})
select.default = DEFAULT

export const doSelect = async (ctx: ChannelsContext, cases: Case[]): Promise<[number, any?]> => {
  const indexes = new Map(cases.map((caze, i) => [caze, i]))

  const readyCases = cases.filter((caze) => {
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
      return [index]
    }
    if (isRecv(caze)) {
      const res = syncRecv(ctx, caze.chanKey)
      return [index, caze.detail ? res : res[0]]
    }
  }

  if (indexes.has(DEFAULT)) return [indexes.get(DEFAULT)]

  const casesByChanKey = new Map<object, [Send[], Recv[]]>()
  cases.forEach((caze) => {
    if (isDefault(caze)) return
    if (casesByChanKey.has(caze.chanKey)) {
      if (isSend(caze)) casesByChanKey.get(caze.chanKey)[0].push(caze)
      if (isRecv(caze)) casesByChanKey.get(caze.chanKey)[1].push(caze)
    } else {
      if (isSend(caze)) casesByChanKey.set(caze.chanKey, [[caze], []])
      if (isRecv(caze)) casesByChanKey.set(caze.chanKey, [[], [caze]])
    }
  })

  const [caze, res] = await new Promise<[Send] | [Recv, [any, boolean]]>((resolve) => {
    const resolvers: (Sender | Recver)[] = []
    const cancel = () => resolvers.forEach((resolver) => {
      resolver.cancelled = true // eslint-disable-line no-param-reassign
    })

    for (const [chanKey, [sends, recvs]] of casesByChanKey.entries()) {
      const ch = getChan(ctx, chanKey)

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
  if (isSend(caze)) return [index]
  if (isRecv(caze)) return [index, caze.detail ? res : res[0]]
  throw new TypeError('unknown case type')
}

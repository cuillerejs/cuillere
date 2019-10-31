import { Middleware } from '../middleware'
import { isStart, delegate } from '../../cuillere'

import { CHANS, isChan, doChan } from './channel'
import { isSend, doSend } from './send'
import { isRecv, doRecv } from './recv'
import { isClose, doClose } from './close'
import { isRange, doRange } from './range'
import { isSelect, doSelect } from './select'

export const channelMiddleware = (): Middleware =>
  async function* channelMiddleware(operation, ctx) {
    if (isStart(operation)) {
      ctx[CHANS] = new WeakMap()
    }

    if (isChan(operation)) {
      return doChan(ctx, operation.bufferSize)
    }

    if (isSend(operation)) {
      return doSend(ctx, operation.chanKey, operation.value)
    }

    if (isRecv(operation)) {
      const res = await doRecv(ctx, operation.chanKey)
      return operation.detail ? res : res[0]
    }

    if (isClose(operation)) {
      return doClose(ctx, operation.chanKey)
    }

    if (isRange(operation)) {
      return doRange(ctx, operation.chanKey)
    }

    if (isSelect(operation)) {
      return doSelect(ctx, operation.cases)
    }

    return yield delegate(operation)
  }

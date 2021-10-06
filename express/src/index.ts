import { Cuillere, cuillere, isGeneratorFunction } from '@cuillere/core'
import express from 'express'
import http from 'http'

export const cuillereExpress = (cllr: Cuillere, { contextKey = 'cuillere' } = {}): typeof express => Object.assign(
  (): express.Application => {
    const app = express()
    return Object.assign(
      app,
      Object.fromEntries(
        Object.entries(app)
          .filter(([, value]) => typeof value === 'function')
          .map(([key, value]) => [
            key,
            (...args: any[]) => {
              value.apply(app, args.map(arg => (
                isGeneratorFunction(arg)
                  ? (...cbArgs: any[]) => {
                    const ctx = cbArgs[0] instanceof http.IncomingMessage ? cbArgs[0][contextKey] ?? (cbArgs[0][contextKey] = {}) : {}
                    return cllr.ctx(ctx).call(arg, ...cbArgs)
                  }
                  : arg
              )))
            },
          ]),
      ),
    )
  },
  express,
)

const app = cuillereExpress(cuillere())()

app.get('/', function* (_, res) {
  res.send('Hello cuillere!')
})

app.listen(3000)

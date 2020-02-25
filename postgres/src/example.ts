import cuillere from '@cuillere/core'
import { query } from './index'
import { transactionMiddleware, queryMiddleware } from './middlewares'
import { PoolProvider } from './pool-provider'

const poolProvider = new PoolProvider(
  {
    name: 'foo',
    database: 'postgres',
    user: 'postgres',
    password: 'password',
    port: 54321,
  },
  {
    name: 'bar',
    database: 'postgres',
    user: 'postgres',
    password: 'password',
    port: 54322,
  },
)

const cllr = cuillere(
  transactionMiddleware({ poolProvider }),
  queryMiddleware(),
);

(async () => {
  try {
    await cllr.call(function* client1() {
      yield query({ text: 'SELECT NOW()', pool: 'foo' })
      yield query({ text: 'SELECT NOW()', pool: 'bar' })
    })
    await cllr.call(function* client2() {
      yield query({ text: 'SELECT NOW()', pool: 'foo' })
      yield query({ text: 'SELECT NOW()', pool: 'bar' })
    })
  } catch (err) {
    console.error(err)
  }

  await poolProvider.end()
})()

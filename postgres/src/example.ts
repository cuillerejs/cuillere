import cuillere from '@cuillere/core'
import { PoolProvider, transactionPlugin, queryPlugin, query } from '.'

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
  transactionPlugin({ poolProvider }),
  queryPlugin(),
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

import cuillere from '@cuillere/core'
import { poolMiddleware, queryMiddleware, query } from './index'

const pool = poolMiddleware(
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
  pool,
  queryMiddleware(),
);

(async () => {
  try {
    await Promise.all([
      cllr.call(function* () {
        console.log('client 1 - query 1')
        yield query({ text: 'SELECT NOW()', pool: 'foo' })
        console.log('client 1 - query 2')
        yield query({ text: 'SELECT NOW()', pool: 'bar' })
      }),
      cllr.call(function* () {
        console.log('client 2 - query 1')
        yield query({ text: 'SELECT NOW()', pool: 'foo' })
        console.log('client 2 - query 2')
        yield query({ text: 'SELECT NOW()', pool: 'bar' })
      }),
    ])
  } catch (err) {
    console.error(err)
  }

  await pool.end()
})()

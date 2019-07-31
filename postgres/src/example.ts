import { makeRunner, call } from '@cuillere/core'
import { poolMiddleware as createPoolMiddleware } from './middlewares/pool'
import { queryMiddleware, query } from './middlewares/query'

const poolMiddleware = createPoolMiddleware(
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

const run = makeRunner(
    poolMiddleware,
    queryMiddleware(),
);

(async () => {
    try {
        await Promise.all([
            run()(call(function* () {
                console.log('client 1 - query 1')
                yield query({ text: 'SELECT NOW()', pool: 'foo' })
                console.log('client 1 - query 2')
                yield query({ text: 'SELECT NOW()', pool: 'bar' })
            })),
            run()(call(function* () {
                console.log('client 2 - query 1')
                yield query({ text: 'SELECT NOW()', pool: 'foo' })
                console.log('client 2 - query 2')
                yield query({ text: 'SELECT NOW()', pool: 'bar' })
            })),
        ])
    } catch (err) {
        console.error(err)
    }

    await poolMiddleware.end()
})()

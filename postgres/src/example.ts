import { makeRunner, call } from '@cuillere/core'
import { poolMiddleware, queryMiddleware, query, end } from './'

const run = makeRunner(
    poolMiddleware(
        {
            name: 'foo',
            database: 'postgres',
            user: 'postgres',
            password: 'password',
            port: 32768,
        },
        {
            name: 'bar',
            database: 'postgres',
            user: 'postgres',
            password: 'password',
            port: 32769,
        },
    ),
    queryMiddleware(),
);

(async () => {
    await Promise.all([
        run()(call(function* () {
            console.log(yield query({ text: 'SELECT NOW()', pool: 'foo' }))
            console.log(yield query({ text: 'SELECT NOW()', pool: 'bar' }))
        })),
        run()(call(function* () {
            console.log(yield query({ text: 'SELECT NOW()', pool: 'foo' }))
            console.log(yield query({ text: 'SELECT NOW()', pool: 'bar' }))
        })),
    ])

    await run()(end())
})()

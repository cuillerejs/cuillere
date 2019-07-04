import { makeRunner, call } from '@cuillere/core'
import { poolMiddleware, queryMiddleware, query, end } from './'

const run = makeRunner(
    poolMiddleware({
        database: 'postgres',
        user: 'postgres',
        password:'password',
        port: 32768,
    }),
    queryMiddleware(),
);

(async () => {
    await Promise.all([
        run()(call(function*() {
            console.log(yield query('SELECT NOW()'))
            console.log(yield query('SELECT NOW()'))
        })),
        run()(call(function*() {
            console.log(yield query('SELECT NOW()'))
            console.log(yield query('SELECT NOW()'))
        })),
    ])

    await run()(end())
})()

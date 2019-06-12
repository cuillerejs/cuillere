import { makeRunner, call } from '@cuillere/core'
import { middleware, query } from './'

makeRunner(middleware({ poolConfig: {
    database: 'postgres',
    user: 'postgres',
    password:'password',
    port: 32768,
} }))()(call(function*() {
    const res = yield query('SELECT NOW()')
    console.log(res)
}))
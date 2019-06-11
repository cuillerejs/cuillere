import * as express from 'express';
import { makeRequestHandler, middleware } from '.';
import { call } from '@cuillere/core';

const app = express()

app.use(middleware)

const caca = makeRequestHandler()

app.get('/', caca(function*(req, res) {
    res.send(yield call(hello))
}))

function* hello() {
    return 'hello !'
}

app.listen(3000)

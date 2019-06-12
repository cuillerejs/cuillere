import * as express from 'express';
import { makeRequestHandlerFactory, middleware } from '.';
import { call, set, get } from '@cuillere/core';

const app = express()

app.use(middleware)

const UPDATE_SYMBOL = Symbol('update')
const updateMiddleware = next => async (operation, ctx) => {
    if (!operation || !operation[UPDATE_SYMBOL]) return next(operation, ctx)
    return next(
        call(function*() {
            yield set(operation['name'], operation['updater'](yield get(operation['name'])))
        }),
        ctx,
    )
}
const update = (name, updater) => ({
    [UPDATE_SYMBOL]: true,
    name,
    updater,
})

const makeRequestHandler = makeRequestHandlerFactory(
    updateMiddleware,
)

app.get('/', makeRequestHandler(function*(req, res) {
    yield set('name', 'toto')
    yield update('name', value => value && value.toUpperCase())
    res.send(yield call(hello))
}))

function* hello() {
    return `hello ${yield get('name')} !`
}

app.listen(3000)

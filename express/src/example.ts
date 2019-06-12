import * as express from 'express';
import { makeRequestHandlerFactory, middleware } from '.';
import { call, set, get, Middleware } from '@cuillere/core';

const app = express()

app.use(middleware)

const UPDATE_SYMBOL = Symbol('update')

interface UpdateOperation {
    [UPDATE_SYMBOL]: true,
    name: string,
    updater(value: any): any
}

function* updateFunc(name, updater) {
    const value = yield get(name)
    const updated = updater(value)
    yield set(name, updated)
    return updated
}

const update = (name, updater): UpdateOperation => ({
    [UPDATE_SYMBOL]: true, name, updater,
})

const isUpdate = (operation: any): operation is UpdateOperation => operation && operation[UPDATE_SYMBOL]

const updateMiddleware: Middleware = next => async (operation) => {
    if (!isUpdate(operation)) return next(operation)
    const value = await next(get(operation.name))
    const updated = operation.updater(value)
    await next(set(operation.name, updated))
    return updated
}

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

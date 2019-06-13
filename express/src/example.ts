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

const update = (name: string, updater: (value: any) => any): UpdateOperation => ({
    [UPDATE_SYMBOL]: true, name, updater,
})

const isUpdate = (operation: any): operation is UpdateOperation => operation && operation[UPDATE_SYMBOL]

const updateMiddleware: Middleware = next => (operation, ctx) => {
    if (!isUpdate(operation)) return next(operation)
    return ctx[operation.name] = operation.updater(ctx[operation.name])
}

const makeRequestHandler = makeRequestHandlerFactory(
    updateMiddleware,
)

app.get('/', makeRequestHandler(function*(_req, res) {
    yield set('name', 'toto')
    yield update('name', value => value && value.toUpperCase())
    res.send(yield call(hello))
}))

function* hello() {
    return `hello ${yield get('name')} !`
}

app.listen(3000)

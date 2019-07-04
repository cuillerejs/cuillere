import { Pool, PoolConfig, PoolClient } from 'pg'
import { Middleware, isStart } from '@cuillere/core'

const GET_CLIENT = Symbol('GET_CLIENT')
const CLIENT = Symbol('CLIENT')

const END = Symbol('END')

interface End {
    [END]: true,
}

export function end(): End {
    return { [END]: true }
}

function isEnd(operation: any): operation is End {
    return operation && operation[END]
}

export function makePool(poolConfig?: PoolConfig) {
    const pool = new Pool(poolConfig)

    const execute = async (ctx: any, cb: Function) => {
        ctx[GET_CLIENT] = async () => {
            let client = ctx[CLIENT]
            if (!client) ctx[CLIENT] = client = await pool.connect()
            return client
        }

        try {
            return await cb()
        } finally {
            if (ctx[CLIENT]) await ctx[CLIENT].release()
        }
    }

    return {
        execute,
        end: () => pool.end(),
    }
}

export const getClient = async (ctx: any): Promise<PoolClient> => ctx[GET_CLIENT]()

export function poolMiddleware(poolConfig?: PoolConfig): Middleware {
    const pool = makePool(poolConfig)

    return next => async (operation, ctx) => {
        if (isStart(operation)) {
            return pool.execute(ctx, () => next(operation))
        }

        if (isEnd(operation)) {
            return pool.end()
        }

        return next(operation)
    }
}

const QUERY = Symbol('QUERY')

interface Query {
    [QUERY]: true,
    sql: string,
}

export function query(sql: string): Query {
    return {
        [QUERY]: true,
        sql,
    }
}

function isQuery(operation: any): operation is Query {
    return operation && operation[QUERY]
}

export function queryMiddleware(): Middleware {

    return next => async (operation, ctx) => {
        if (!isQuery(operation)) return next(operation)

        const client = await getClient(ctx)

        return client.query(operation.sql)
    }
}
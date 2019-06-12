import { Pool, PoolClient, PoolConfig } from 'pg'
import { Middleware } from '@cuillere/core'

interface Options {
    poolConfig?: PoolConfig
}

const QUERY = Symbol("QUERY")

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

export function middleware(options: Options = {}): Middleware {
    const CLIENT = Symbol("CLIENT")

    const pool = new Pool(options.poolConfig)

    return next => async (operation, ctx) => {
        if (!isQuery(operation)) return next(operation)

        let client: PoolClient = ctx[CLIENT]
        if (!client) {
            ctx[CLIENT] = client = await pool.connect()
        }

        try {
            return await client.query(operation.sql)
        } finally {
            client.release()
        }
    }
}
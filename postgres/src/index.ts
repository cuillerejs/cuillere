import { Pool, PoolConfig as PgPoolConfig, PoolClient, QueryConfig as PgQueryConfig } from 'pg'
import { Middleware, isStart } from '@cuillere/core'

const GET_CLIENT = Symbol('GET_CLIENT')
const CLIENTS = Symbol('CLIENTS')
const DEFAULT_POOL = 'DEFAULT POOL'

const values = obj => [
    ...Object.values(obj),
    ...Object.getOwnPropertySymbols(obj).map(symbol => obj[symbol]),
]

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

interface PoolConfig extends PgPoolConfig {
    name?: string;
}

export function makePool(...poolConfigs: PoolConfig[]) {
    const pools: any = {}

    if (poolConfigs.length <= 1) {
        const [poolConfig] = poolConfigs
        const name = (poolConfig && poolConfig.name) || DEFAULT_POOL
        pools[name] = new Pool(poolConfig)
    } else {
        poolConfigs.forEach(({ name, ...poolConfig }) => {
            if (!name) throw new TypeError('Each pool config should have a name')
            pools[name] = new Pool(poolConfig)
        })
    }

    const execute = async (ctx: any, cb: Function) => {
        if (!ctx[CLIENTS]) ctx[CLIENTS] = {}

        ctx[GET_CLIENT] = async (name?: string) => {
            const clientName = name || DEFAULT_POOL
            const pool = pools[clientName]
            let client = ctx[CLIENTS][clientName]
            if (!client) ctx[CLIENTS][clientName] = client = await pool.connect()
            return client
        }

        try {
            return await cb()
        } finally {
            await values(ctx[CLIENTS]).reduce(async (acc, client: any) => {
                await acc
                await client.release()
            }, Promise.resolve())
        }
    }

    execute.end = (): any => values(pools).reduce(async (acc, pool: any) => {
        await acc
        await pool.end()
    }, Promise.resolve())

    return execute
}

export const getClient = async (ctx: any, name?: string): Promise<PoolClient> => ctx[GET_CLIENT](name)

export function poolMiddleware(...poolConfigs: PoolConfig[]): Middleware {
    const pool = makePool(...poolConfigs)

    return next => async (operation, ctx) => {
        if (isStart(operation)) {
            return pool(ctx, () => next(operation))
        }

        if (isEnd(operation)) {
            return pool.end()
        }

        return next(operation)
    }
}

interface QueryConfig extends PgQueryConfig {
    pool?: string;
}

const QUERY = Symbol('QUERY')

interface Query {
    [QUERY]: true;
    config: QueryConfig;
}

// FIXME support same signatures as pg's query
export const query = (config: QueryConfig): Query => ({
    [QUERY]: true,
    config,
})

function isQuery(operation: any): operation is Query {
    return operation && operation[QUERY]
}

export const queryMiddleware = (): Middleware => next => async (operation, ctx) => {
    if (!isQuery(operation)) return next(operation)

    const { pool, ...config } = operation.config

    const client = await getClient(ctx, pool)

    return client.query(config)
}
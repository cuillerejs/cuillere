import { allSettled as promiseAllSettled, chain as promiseChain } from '../utils/promise'
import { Middleware } from './index';

const ALL = Symbol('ALL')

interface All {
  [ALL]: true
  values: Iterable<any>
}

export const all = (values: Iterable<any>): All => ({
  [ALL]: true,
  values,
})

const isAll = (operation): operation is All => operation && operation[ALL]

const ALL_SETTLED = Symbol('ALL_SETTLED')

interface AllSettled {
  [ALL_SETTLED]: true
  values: Iterable<any>
}

export const allSettled = (values: Iterable<any>): AllSettled => ({
  [ALL_SETTLED]: true,
  values,
})

const isAllSettled = (operation): operation is AllSettled => operation && operation[ALL_SETTLED]

const CHAIN = Symbol('CHAIN')

interface Chain {
  [CHAIN]: true
  values: Iterable<any>
}

const isChain = (operation): operation is Chain => operation && operation[CHAIN]

export const chain = (values: Iterable<any>): Chain => ({
  [CHAIN]: true,
  values,
})

export const promiseMiddleware: Middleware = next => (operation, _ctx, run) => {
  if (isAll(operation)) return Promise.all(Array.from(operation.values, run))
  if (isAllSettled(operation)) return promiseAllSettled(Array.from(operation.values, run))
  if (isChain(operation)) return promiseChain(Array.from(operation.values), run)

  return next(operation)
}

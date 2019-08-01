import { chain as promiseChain, allSettled as promiseAllSettled } from '../utils/promise'
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

const CHAIN = Symbol('CHAIN')

interface Chain {
  [CHAIN]: true
  values: Iterable<any>
}

export const chain = (values: Iterable<any>): Chain => ({
  [CHAIN]: true,
  values,
})

const isChain = (operation): operation is Chain => operation && operation[CHAIN]

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

export const promiseMiddleware: Middleware = next => (operation, _ctx, run) => {
  if (isAll(operation)) return Promise.all([...operation.values].map(run))
  if (isChain(operation)) return promiseChain([...operation.values], run)
  if (isAllSettled(operation)) return promiseAllSettled([...operation.values].map(run))

  return next(operation)
}

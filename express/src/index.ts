import { RequestHandler, NextFunction, Request, Response } from 'express';
import { Middleware, makeRunner, GeneratorFunction, call } from '@cuillere/core';

const CTX_SYMBOL = Symbol("CTX_SYMBOL")

export const middleware: RequestHandler = (req, _res, next) => {
  if (req[CTX_SYMBOL]) console.warn('FIXME')
  req[CTX_SYMBOL] = {} // New request wide context
  next()
}

export const getContext = (req: Request): any => {
  return req[CTX_SYMBOL]
}

// FIXME rename
export const makeRequestHandler = (...middlewares: Middleware[]) => {
  const run = makeRunner(...middlewares)

  return (operation: GeneratorFunction<[Request, Response, NextFunction], any>): RequestHandler => (req, ...args) => {
    run(call(operation, req, ...args), getContext(req))
  }
}
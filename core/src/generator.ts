import { TSGenerator, TSAsyncGenerator } from './utils/ts-generator'

export interface GeneratorFunction<Args extends any[] = any[], R = any, Yield = any> {
  (...args: Args): Generator<R, Yield> | AsyncGenerator<R, Yield>
}

export type Generator<R = any, Yield = any> = TSGenerator<Yield, R, any> | TSAsyncGenerator<Yield, R, any>

export const isGenerator = (value: any): value is Generator | AsyncGenerator =>
  Boolean(value && value.next && value.throw && value.return)

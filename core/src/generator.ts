import { TSGenerator, TSAsyncGenerator } from './utils/ts-generator'

export interface GeneratorFunction<Args extends any[] = any[], R = any> {
  (...args: Args): Generator<R> | AsyncGenerator<R>
}

export type Generator<R = any> = TSGenerator<R> | TSAsyncGenerator<R>

export const isGenerator = (value: any): value is Generator | AsyncGenerator =>
  Boolean(value && value.next && value.throw && value.return)

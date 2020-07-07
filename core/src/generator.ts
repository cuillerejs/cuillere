import { TSGenerator, TSAsyncGenerator } from './utils/ts-generator'

export interface GeneratorFunction<Args extends any[] = any[], R = any, Yield = any> {
  (...args: Args): Generator<R, Yield>
}

export type Generator<R = any, Yield = any> = (TSGenerator<Yield, R, any> | TSAsyncGenerator<Yield, R, any>) & { name?: string }

export const isGenerator = (value: any): value is Generator => Boolean(value.next && value.throw && value.return)

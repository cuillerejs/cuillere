export type Generator<R> = Iterator<R> | AsyncIterator<R>

export type GeneratorFunc<Args extends any[], R> = (...args: Args) => Generator<R>

export const isGenerator = (value: any): value is Generator<any> => Boolean(value.next && value.throw && value.return)

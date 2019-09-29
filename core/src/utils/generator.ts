export type Generator<R> = Iterator<R> | AsyncIterator<R>

export type GeneratorFunc<Args extends any[], R> = (...args: Args) => Generator<R>

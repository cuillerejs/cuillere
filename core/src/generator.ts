export interface GeneratorFunction<Args extends any[] = any[], R = any, Yield = any> {
  (...args: Args): GenericGenerator<R, Yield>
}

type GenericGenerator<R = any, Yield = any> = (Generator<Yield, R, any> | AsyncGenerator<Yield, R, any>) & { name?: string }
export { GenericGenerator as Generator }

export const isGenerator = (value: any): value is GenericGenerator => Boolean(value?.next && value?.throw && value?.return)

import { TSGenerator, TSAsyncGenerator } from './utils/ts-generator'

const GeneratorFunctionPrototype = Object.getPrototypeOf(function* () {}) // eslint-disable-line @typescript-eslint/no-empty-function
const GeneratorPrototype = GeneratorFunctionPrototype.prototype

const AsyncGeneratorFunctionPrototype = Object.getPrototypeOf(async function* () {}) // eslint-disable-line @typescript-eslint/no-empty-function
const AsyncGeneratorPrototype = AsyncGeneratorFunctionPrototype.prototype

export type GeneratorFunction<Args extends any[] = any[], R = any, Yield = any> = (...args: Args) => Generator<R, Yield>

export function isGeneratorFunction(value: any): value is GeneratorFunction {
  return GeneratorFunctionPrototype.isPrototypeOf(value) || AsyncGeneratorFunctionPrototype.isPrototypeOf(value) // eslint-disable-line no-prototype-builtins
}

export type Generator<R = any, Yield = any> = (TSGenerator<Yield, R, any> | TSAsyncGenerator<Yield, R, any>) & { name?: string }

export function isGenerator(value: any): value is Generator {
  return GeneratorPrototype.isPrototypeOf(value) || AsyncGeneratorPrototype.isPrototypeOf(value) // eslint-disable-line no-prototype-builtins
}

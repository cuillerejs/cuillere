const GeneratorFunctionPrototype = Object.getPrototypeOf(function* () {}) // eslint-disable-line @typescript-eslint/no-empty-function
const GeneratorPrototype = GeneratorFunctionPrototype.prototype

const AsyncGeneratorFunctionPrototype = Object.getPrototypeOf(async function* () {}) // eslint-disable-line @typescript-eslint/no-empty-function
const AsyncGeneratorPrototype = AsyncGeneratorFunctionPrototype.prototype

export type GeneratorFunction<Args extends any[] = any[], R = any, Yield = any> = (...args: Args) => GenericGenerator<R, Yield>

export function isGeneratorFunction(value: any): value is GeneratorFunction {
  return GeneratorFunctionPrototype.isPrototypeOf(value) || AsyncGeneratorFunctionPrototype.isPrototypeOf(value) // eslint-disable-line no-prototype-builtins
}

type GenericGenerator<R = any, Yield = any> = (Generator<Yield, R, any> | AsyncGenerator<Yield, R, any>) & { name?: string }
export { GenericGenerator as Generator }

export function isGenerator(value: any): value is GenericGenerator {
  return GeneratorPrototype.isPrototypeOf(value) || AsyncGeneratorPrototype.isPrototypeOf(value) // eslint-disable-line no-prototype-builtins
}

const GeneratorFunctionPrototype = Object.getPrototypeOf(function* () { }) // eslint-disable-line @typescript-eslint/no-empty-function
const GeneratorPrototype = GeneratorFunctionPrototype.prototype

const AsyncGeneratorFunctionPrototype = Object.getPrototypeOf(async function* () { }) // eslint-disable-line @typescript-eslint/no-empty-function
const AsyncGeneratorPrototype = AsyncGeneratorFunctionPrototype.prototype

/**
 * Either a [GeneratorFunction](https://mdn.io/GeneratorFunction) or an [AsyncGeneratorFunction](https://mdn.io/AsyncGeneratorFunction).
 *
 * @param args Function's arguments.
 * @returns Either a [Generator](https://mdn.io/Generator) or an [AsyncGenerator](https://mdn.io/AsyncGenerator), see [[Generator]].
 * @typeParam Args Function's arguments type.
 * @typeParam R Function's return type.
 * @typeParam Yield Function's yield type.
 */
export type GeneratorFunction<Args extends any[] = any[], R = any, Yield = any> = (...args: Args) => GenericGenerator<R, Yield>

/**
 * Checks if `value` is a [GeneratorFunction](https://mdn.io/GeneratorFunction) or an [AsyncGeneratorFunction](https://mdn.io/AsyncGeneratorFunction).
 *
 * @param value Value to be checked.
 * @returns `true` if `value` is a [GeneratorFunction](https://mdn.io/GeneratorFunction) or an [AsyncGeneratorFunction](https://mdn.io/AsyncGeneratorFunction),
 *          `false` otherwise.
 */
export function isGeneratorFunction(value: any): value is GeneratorFunction {
  return GeneratorFunctionPrototype.isPrototypeOf(value) || AsyncGeneratorFunctionPrototype.isPrototypeOf(value) // eslint-disable-line no-prototype-builtins
}

/**
 * Either a [Generator](https://mdn.io/Generator) or an [AsyncGenerator](https://mdn.io/AsyncGenerator).
 *
 * @typeParam R Generator's return type.
 * @typeParam Yield Generator's yield type.
 */
type GenericGenerator<R = any, Yield = any> = (Generator<Yield, R, any> | AsyncGenerator<Yield, R, any>)
export { GenericGenerator as Generator }

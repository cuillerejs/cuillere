export function compose(...functions: Function[]): Function {
  if (functions.length === 0) return (arg: any[]): any => arg
  if (functions.length === 1) return functions[0]
  return functions.reduce((acc, f) => (...args: any[]): any => acc(f(...args)))
}

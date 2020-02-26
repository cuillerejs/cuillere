const EXECUTE = Symbol('EXECUTE')

interface Execute {
  [EXECUTE]: true
  gen: Generator | AsyncGenerator
}

export function isExecute(operation: any): operation is Execute {
  return Boolean(operation?.[EXECUTE])
}

export function execute(gen: Generator | AsyncGenerator): Execute {
  return { [EXECUTE]: true, gen }
}

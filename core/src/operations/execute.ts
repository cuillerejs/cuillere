import { Operation, makeOperation } from './operation'

interface Execute extends Operation {
  gen: Generator | AsyncGenerator
}

export const [execute, isExecute] = makeOperation(
  Symbol('EXECUTE'),
  (operation, gen: Generator | AsyncGenerator): Execute => ({
    ...operation, gen,
  }),
)

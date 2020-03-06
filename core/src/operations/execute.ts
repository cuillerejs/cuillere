import { Operation } from './operation'
import { Generator } from '../generator'

export interface Execute extends Operation {
  gen: Generator
}

export function execute(gen: Generator): Execute {
  return {
    kind: 'execute',
    gen,
  }
}

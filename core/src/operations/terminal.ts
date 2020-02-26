import { makeWrapperOperation } from './operation'

export const [terminal, isTerminal] = makeWrapperOperation(Symbol('TERMINAL'))

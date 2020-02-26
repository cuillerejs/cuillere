import { WrapperOperation, makeWrapperOperation } from './operation'

const TERMINAL = Symbol('TERMINAL')

export type Terminal = WrapperOperation<typeof TERMINAL>

export const [terminal, isTerminal] = makeWrapperOperation<typeof TERMINAL, Terminal, []>(TERMINAL)

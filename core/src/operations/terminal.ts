import { Wrapper, makeWrapper } from './wrapper'

const TERMINAL = Symbol('TERMINAL')

export type Terminal = Wrapper<typeof TERMINAL>

export const [terminal, isTerminal] = makeWrapper<typeof TERMINAL, Terminal, []>(TERMINAL)

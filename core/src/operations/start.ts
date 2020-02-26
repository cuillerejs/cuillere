import { Wrapper, makeWrapper } from './wrapper'

const START = Symbol('START')

export type Start = Wrapper<typeof START>

export const [start, isStart] = makeWrapper<typeof START, Start, []>(START)

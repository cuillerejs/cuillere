import { Wrapper, makeWrapper } from './wrapper'

const NEXT = Symbol('NEXT')

export type Next = Wrapper<typeof NEXT>

export const [next, isNext] = makeWrapper<typeof NEXT, Next, []>(NEXT)

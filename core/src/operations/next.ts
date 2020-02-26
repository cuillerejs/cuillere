import { WrapperOperation, makeWrapperOperation } from './operation'

const NEXT = Symbol('NEXT')

export type Next = WrapperOperation<typeof NEXT>

export const [next, isNext] = makeWrapperOperation<typeof NEXT, Next, []>(NEXT)

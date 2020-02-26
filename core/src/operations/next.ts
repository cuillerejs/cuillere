import { makeWrapperOperation } from './operation'

export const [next, isNext] = makeWrapperOperation(Symbol('NEXT'))

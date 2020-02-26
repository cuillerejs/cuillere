import { makeWrapperOperation } from './operation'

export const [start, isStart] = makeWrapperOperation(Symbol('START'))

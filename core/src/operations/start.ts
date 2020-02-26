import { WrapperOperation, makeWrapperOperation } from './operation'

const START = Symbol('START')

export type Start = WrapperOperation<typeof START>

export const [start, isStart] = makeWrapperOperation<typeof START, Start, []>(START)

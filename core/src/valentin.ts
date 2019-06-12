const f1 = next => op => next(op)
const f2 = next => op => next(op)
const f3 = next => op => next(op)

const final = op => 'coucou'

f1(f2(f3(final)))

// arg => f1(f2(arg))

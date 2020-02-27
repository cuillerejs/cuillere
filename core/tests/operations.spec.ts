import { makeOperation, makeWrapperOperation } from '../src/operations'

describe('operations', () => {
  it('should return tow functions', () => {
    const result = makeOperation(Symbol('test'))
    expect(result).toHaveLength(2)
    expect(result.every(f => typeof f === 'function')).toBeTruthy()
  })

  it('should return matching factory and checker', () => {
    const [operation, isOperation] = makeOperation(Symbol('test'))
    expect(isOperation(operation())).toBeTruthy()
  })

  it('should allow to customize the created operation', () => {
    const [operation] = makeOperation(Symbol('test'), operation => ({ ...operation, test: 'test' }))
    expect(operation()).toMatchObject({ test: 'test' })
  })

  it('should return matching factory and checker for wrapper operation', () => {
    const [operation, isOperation] = makeOperation(Symbol('test'))
    expect(isOperation(operation())).toBeTruthy()
  })

  it('should create an operation wrapping another operation', () => {
    const [operation] = makeWrapperOperation(Symbol('test'))
    expect(operation('test')).toMatchObject({ operation: 'test' })
  })

  it('should allow to customize wrapping operation', () => {
    const [operation] = makeWrapperOperation(Symbol('test'), operation => ({ ...operation, test: 'test' }))
    expect(operation('test')).toMatchObject({ test: 'test' })
  })
})

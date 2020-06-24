import { terminal } from './terminal'
import { fork } from './fork'
import { defer } from './defer'
import { recover } from './recover'

describe('terminal', () => {
  function* dummy() {
    // dummy
  }

  it('should not accept fork operation', () => {
    expect(() => terminal(fork(dummy()))).toThrow(TypeError)
    expect(() => terminal(fork(dummy()))).toThrow('terminal forks are forbidden')
  })

  it('should not accept defer operation', () => {
    expect(() => terminal(defer(dummy()))).toThrow(TypeError)
    expect(() => terminal(defer(dummy()))).toThrow('terminal defers are forbidden')
  })

  it('should not accept recover operation', () => {
    expect(() => terminal(recover())).toThrow(TypeError)
    expect(() => terminal(recover())).toThrow('terminal recovers are forbidden')
  })

  it('should not accept terminal operation', () => {
    expect(() => terminal(terminal(dummy()))).toThrow(TypeError)
    expect(() => terminal(terminal(dummy()))).toThrow('terminals cannot be nested')
  })
})
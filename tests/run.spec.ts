/*eslint-env jest*/
import { Context, crud, call, run } from '../src'

describe('run', () => {
  let ctx: Context
  beforeEach(() => {
    const services = {
      service1: { get1: id => ({ id }) },
      service2: { get2: id => ({ id }) },
    }

    ctx = { getService: name => services[name] }
  })

  it('should run a basic example', async () => {
    function* test1(entity1, entity2) {
      return [entity1, entity2]
    }

    function* test2() {
      const entity1 = yield crud('service1', 'get1', 1)
      const entity2 = yield crud('service2', 'get2', 2)
      return call(test1, entity1, entity2)
    }

    expect(await run(call(test2), ctx)).toEqual([{ id: 1 }, { id: 2 }])
  })
})

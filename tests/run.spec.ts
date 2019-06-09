/*eslint-env jest*/
import { Context, crud, call, run, makeServices } from '../src'

describe('run', () => {
  const ctx: Context = { getService: name => services[name] }
  const services = {
    service1: { get1: id => Promise.resolve({ id }) },
    service2: { get2: id => Promise.resolve({ id }) },
  }

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

  it('should run a basic example with service factory', async () => {
    const {
      getService,
      services: { service1, service2 },
    } = makeServices(services)

    function* test1(entity1, entity2) {
      return [entity1, entity2]
    }

    function* test2() {
      const entity1 = yield service1.get1(1)
      const entity2 = yield service2.get2(2)
      return call(test1, entity1, entity2)
    }

    expect(await run(call(test2), { getService })).toEqual([{ id: 1 }, { id: 2 }])
  })
})

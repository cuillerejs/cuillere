/*eslint-env jest */

import { makeServices } from '../src'

describe('services', () => {
  describe('makeServices', () => {
    let services
    beforeEach(() => {
      services = {
        service1: {
          get: jest.fn().mockName('service1.get'),
          put: jest.fn().mockName('service1.put'),
        },
        service2: {
          get: jest.fn().mockName('service1.get'),
          put: jest.fn().mockName('service1.put'),
        },
      }
    })

    it('should return the getService function', () => {
      const result = makeServices(services)
      expect(typeof result.getService).toBe('function')
    })

    it('should create a getService function which returns the requested service', () => {
      const result = makeServices(services)
      expect(result.getService('service1')).toBe(services.service1)
    })

    it('should return an object with all services', () => {
      const result = makeServices(services)
      const keys = Object.keys(result.services)
      expect(keys).toContain('service1')
      expect(keys).toContain('service2')
    })

    it('should return an object with all services with all methods', () => {
      const result = makeServices(services)

      const keysService1 = Object.keys(result.services.service1)
      expect(keysService1).toContain('get')
      expect(keysService1).toContain('put')

      const keysService2 = Object.keys(result.services.service2)
      expect(keysService2).toContain('get')
      expect(keysService2).toContain('put')
    })
  })
})

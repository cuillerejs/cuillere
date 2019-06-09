import { run, crud, Context, Service } from '../src'

describe('run', () => {
  describe('runCallOperation', () => {
    let ctx: Context, service: Service
    beforeEach(() => {
      service = { methodName: jest.fn().mockResolvedValue('result') }
      ctx = { getService: jest.fn().mockReturnValue(service) }
    })

    it('should call the method on the service', async () => {
      expect(await run(crud('serviceName', 'methodName'), ctx)).toBe('result')
      expect(ctx.getService).toBeCalledWith('serviceName')
    })

    it('should call the service method with the given arguments', async () => {
      await run(crud('serviceName', 'methodName', 'arg1', 'arg2'), ctx)
      expect(service.methodName).toBeCalledWith('arg1', 'arg2')
    })
  })
})
